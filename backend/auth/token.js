function obterTokenDarequest(req) {
  const headerAuth = req.headers.authorization;
  if (typeof headerAuth === 'string') {
    const [esquema, token] = headerAuth.trim().split(/\s+/);
    if (esquema && esquema.toLowerCase() === 'bearer' && token) {
      return token.trim();
    }
  }

  const tokenCabecalho = req.headers['x-auth-token'];
  if (typeof tokenCabecalho === 'string' && tokenCabecalho.trim()) {
    return tokenCabecalho.trim();
  }

  return null;
}

module.exports = { obterTokenDarequest };
