const crypto = require('crypto');
const { auditContext, Logger } = require('@siiges-services/shared');
const EXCLUDED_MODELS = require('./audit-excluded-models');

const SENSITIVE_FIELD_PATTERN = /password|contrasena|token|secret/i;

const FIELD_EXCLUSIONS = {
  Persona: ['curp', 'rfc', 'ine', 'telefono', 'celular', 'fechaNacimiento', 'fotografia'],
};

const MAX_FIELD_LENGTH = 500;

const sanitizarValor = (modelName, key, value) => {
  if (SENSITIVE_FIELD_PATTERN.test(key)) return '[REDACTED]';
  if (FIELD_EXCLUSIONS[modelName]?.includes(key)) return '[OMITIDO:PII]';
  if (typeof value === 'string' && value.length > MAX_FIELD_LENGTH) {
    const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
    return `[TRUNCADO ${value.length} chars, sha256:${hash}]`;
  }
  return value;
};

const sanitizar = (modelName, obj) => {
  if (!obj) return obj;
  const limpio = {};
  Object.entries(obj).forEach(([key, value]) => {
    limpio[key] = sanitizarValor(modelName, key, value);
  });
  return limpio;
};

const snapshotAnterior = (instance) => {
  const atributos = Object.keys(instance.constructor.rawAttributes || {});
  const snapshot = {};
  atributos.forEach((campo) => {
    snapshot[campo] = instance.previous(campo);
  });
  return snapshot;
};

const registerAuditHooks = (sequelize) => {
  // Si la operación auditada va en una transacción, la bitácora también:
  // un rollback revierte el cambio y su registro de auditoría juntos.
  const saveLog = async (data, options = {}) => {
    await sequelize.models.Bitacora.create(data, { transaction: options.transaction });
  };

  const conManejoDeErrores = (nombreHook, fn) => async (instance, options) => {
    try {
      await fn(instance, options);
    } catch (err) {
      Logger.error(`[audit-log] Fallo en hook ${nombreHook} para ${instance?.constructor?.name}: ${err.message}`, {
        stack: err.stack,
        registroId: instance?.id,
      });
    }
  };

  const armarBase = () => {
    const store = auditContext.getStore();
    return {
      usuarioId: store?.usuarioId || null,
      lugar: (store?.endpoint || 'proceso interno').slice(0, 255),
      requestId: store?.requestId || null,
    };
  };

  const logCreate = conManejoDeErrores('afterCreate', async (instance, options) => {
    const entidad = instance.constructor.name;
    if (EXCLUDED_MODELS.includes(entidad)) return;
    await saveLog({
      ...armarBase(),
      accion: 'CREATE',
      entidad,
      registroId: instance.id,
      datosAnteriores: null,
      datosNuevos: sanitizar(entidad, instance.toJSON()),
    }, options);
  });

  const logUpdate = conManejoDeErrores('afterUpdate', async (instance, options) => {
    const entidad = instance.constructor.name;
    if (EXCLUDED_MODELS.includes(entidad)) return;

    const cambios = (instance.changed() || []).filter((c) => c !== 'updatedAt');
    if (!cambios.length) return;

    const esBajaLogica = cambios.includes('deletedAt')
      && instance.get('deletedAt')
      && !instance.previous('deletedAt');

    if (esBajaLogica) {
      await saveLog({
        ...armarBase(),
        accion: 'DELETE',
        entidad,
        registroId: instance.id,
        datosAnteriores: sanitizar(entidad, snapshotAnterior(instance)),
        datosNuevos: null,
      }, options);
      return;
    }

    const anteriores = {};
    const nuevos = {};
    cambios.forEach((campo) => {
      anteriores[campo] = instance.previous(campo);
      nuevos[campo] = instance.get(campo);
    });

    await saveLog({
      ...armarBase(),
      accion: 'UPDATE',
      entidad,
      registroId: instance.id,
      datosAnteriores: sanitizar(entidad, anteriores),
      datosNuevos: sanitizar(entidad, nuevos),
    }, options);
  });

  const logDestroy = conManejoDeErrores('beforeDestroy', async (instance, options) => {
    const entidad = instance.constructor.name;
    if (EXCLUDED_MODELS.includes(entidad)) return;
    await saveLog({
      ...armarBase(),
      accion: 'DELETE',
      entidad,
      registroId: instance.id,
      datosAnteriores: sanitizar(entidad, instance.toJSON()),
      datosNuevos: null,
    }, options);
  });

  sequelize.addHook('afterCreate', logCreate);
  sequelize.addHook('afterUpdate', logUpdate);
  sequelize.addHook('beforeDestroy', logDestroy);
};

module.exports = registerAuditHooks;
