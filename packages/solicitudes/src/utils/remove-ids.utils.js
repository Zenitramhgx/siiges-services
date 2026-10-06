const DEFAULT_KEYS_TO_REMOVE = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'acuerdoRvoe', 'fechaSurteEfecto'];

function removeIds(obj, options = {}) {
  const { keep = [] } = options;

  if (typeof obj !== 'object' || obj === null || obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeIds(item, options));
  }

  const keysToRemove = DEFAULT_KEYS_TO_REMOVE.filter((key) => !keep.includes(key));

  const newObj = Object.keys(obj)
    .filter((key) => !keysToRemove.includes(key))
    .reduce((acc, key) => {
      if (typeof obj[key] === 'object') {
        return { ...acc, [key]: removeIds(obj[key], options) };
      }
      return { ...acc, [key]: obj[key] };
    }, {});

  return newObj;
}

module.exports = removeIds;
