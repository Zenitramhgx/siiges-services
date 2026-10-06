/* eslint-disable max-len */
// eslint-disable-next-line import/no-extraneous-dependencies
const supertest = require('supertest');
const {
  downServer,
  upServer,
  statusCodeName,
  createUserAndToken,
} = require('./utils/fixtures/server');
const { upSeed, downSeed } = require('./utils/umzug');
const { createUser } = require('./utils/fixtures/users');
const { models } = require('../packages/core/src/drivers/db/connection');

describe('test for clone solicitudes (tipos 4, 5 y 6)', () => {
  let api = null;
  let headers = null;
  let user = null;

  beforeAll(async () => {
    api = supertest(await upServer());
    await upSeed();
    const result = await createUserAndToken(createUser);
    user = result.user;
    headers = result.headers;
  });

  afterAll(async () => {
    await downSeed();
    await downServer();
  });

  describe('success cases', () => {
    it.each([
      ['cambioRepresentanteLegal', 4],
      ['actualizacion', 5],
      ['cambioNombreInstitucion', 6],
    ])('should clone solicitud 1 as %s (tipo %i)', async (route, tipoSolicitudId) => {
      const { body, statusCode } = await api
        .post(`/api/v1/solicitudes/1/${route}`)
        .send({ tipoSolicitudId })
        .set(headers);

      expect(statusCode).toEqual(statusCodeName.created);
      expect(body.data.id).toBeDefined();
      expect(body.data.folio).toBeDefined();
      expect(body.data.tipoSolicitudId).toEqual(tipoSolicitudId);
      expect(body.data.estatusSolicitudId).toEqual(1);

      // El usuarioId proviene del JWT (usuario nuevo autenticado),
      // no de la solicitud original (usuario 5 de los seeds).
      expect(body.data.usuarioId).toEqual(user.id);

      const originalFolio = (await models.Solicitud.findByPk(1)).folio;
      expect(body.data.folio).not.toEqual(originalFolio);
    });

    it('should keep acuerdoRvoe/fechaSurteEfecto on tipo 5 and drop them otherwise', async () => {
      const { body: body5, statusCode: statusCode5 } = await api
        .post('/api/v1/solicitudes/1/actualizacion')
        .send({ tipoSolicitudId: 5 })
        .set(headers);
      const { body: body4, statusCode: statusCode4 } = await api
        .post('/api/v1/solicitudes/1/cambioRepresentanteLegal')
        .send({ tipoSolicitudId: 4 })
        .set(headers);

      expect(statusCode5).toEqual(statusCodeName.created);
      expect(statusCode4).toEqual(statusCodeName.created);

      const programa5 = await models.Programa.findByPk(body5.data.programa.id);
      const programa4 = await models.Programa.findByPk(body4.data.programa.id);

      expect(programa5.acuerdoRvoe).toBeDefined();
      expect(programa5.fechaSurteEfecto).toBeDefined();
      expect(programa4.acuerdoRvoe).toBeNull();
      expect(programa4.fechaSurteEfecto).toBeNull();
    });
  });

  describe('failure cases', () => {
    it('should return 400 when tipoSolicitudId does not match the route', async () => {
      const { statusCode } = await api
        .post('/api/v1/solicitudes/1/cambioRepresentanteLegal')
        .send({ tipoSolicitudId: 5 })
        .set(headers);
      expect(statusCode).toEqual(statusCodeName.badRequest);
    });

    it('should return 400 when tipoSolicitudId is missing', async () => {
      const { statusCode } = await api
        .post('/api/v1/solicitudes/1/actualizacion')
        .send({})
        .set(headers);
      expect(statusCode).toEqual(statusCodeName.badRequest);
    });

    it('should return 400 when the body includes usuarioId (additionalProperties false)', async () => {
      const { statusCode } = await api
        .post('/api/v1/solicitudes/1/cambioRepresentanteLegal')
        .send({ tipoSolicitudId: 4, usuarioId: 1 })
        .set(headers);
      expect(statusCode).toEqual(statusCodeName.badRequest);
    });

    it('should return 404 when the solicitud does not exist', async () => {
      const { statusCode } = await api
        .post('/api/v1/solicitudes/999999/cambioRepresentanteLegal')
        .send({ tipoSolicitudId: 4 })
        .set(headers);
      expect(statusCode).toEqual(statusCodeName.notFound);
    });
  });
});
