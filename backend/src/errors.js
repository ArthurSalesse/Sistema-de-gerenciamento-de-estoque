export class HttpError extends Error {
  constructor(status, message, campos) {
    super(message);
    this.status = status;
    // Erros por campo, ex.: { email: 'E-mail inválido.' }
    this.campos = campos;
  }
}

export class ValidacaoError extends HttpError {
  constructor(campos) {
    super(400, 'Dados inválidos.', campos);
  }
}
