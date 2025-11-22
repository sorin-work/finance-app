declare global {
  namespace Express {
    interface Request {
      /** Set by the requireAuth middleware. */
      userId?: string;
    }
  }
}

export {};
