const configuredApiBase = process.env.REACT_APP_API_URL || '';

const inferredApiBase =
  typeof window !== 'undefined' && window.location.port === '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';

const API_BASE_URL = configuredApiBase || inferredApiBase;

export default API_BASE_URL;
