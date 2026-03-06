function buildPrefixedId(prefix, objectId) {
  const seed = String(objectId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  const tail = seed.slice(-10).padStart(10, '0');
  return `${prefix}_${tail}`;
}

module.exports = {
  buildPrefixedId
};
