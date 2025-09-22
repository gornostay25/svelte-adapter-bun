declare global {
  namespace App {
    export interface Platform {
      server: Bun.Server;
      request: Request;
    }
  }
}
