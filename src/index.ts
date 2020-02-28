#!/usr/bin/env node

import { certificateFor } from "devcert"
import http from "http"
import http2 from "http2"
import ServeStatic from "serve-static"
import finalhandler from "finalhandler"

// TODO: vs HttpsLocalhost.Config
export interface ServeConfig {
  rootDir: string,
  port: number,
  domain: string,
  redirectFromPort?: number,
  redirect404To: string
}

// TODO: vs HttpsLocalhost.Certs
export interface Certs {
  key: Buffer,
  cert: Buffer
}

// TODO: compression & minify?
// TODO: custom middleware/next function?
// TODO: custom certificate
export default class HttpsLocalhost {

  private serverConfig = {
    cacheControl: false,
    fallthrough: false
  }

  private serveConfig = {
    rootDir: process.cwd(),
    port: 443,
    domain: "localhost",
    redirectFromPort: 80,
    redirect404To: "/index.html"  //TODO: better name
  }

  protected errorhandler(req: any, res: any, config: ServeConfig) {
    const p404 = config.rootDir + config.redirect404To
    const h404 = ServeStatic(p404, this.serverConfig)
    const next = finalhandler(req, res)

    return (err?: any) => {
      switch (err?.status) {
        case 404:
          return h404(req, res, next)
        default:
          return next(err)
      }
    }
  }

  public async getCerts(domain = "localhost"): Promise<Certs> {
    // TODO: options
    return certificateFor(domain)
  }

  public redirectHttp(config: ServeConfig): http.Server {
    const httpServer = http.createServer((req, res) => {
      const url = new URL(req.headers.host || config.domain)
      res.writeHead(301, { Location: `https://${url.hostname}:${config.port}/${url.pathname}` })
      res.end()
    }).listen(config.redirectFromPort)
    // TODO: print only if no error
    console.info("http to https redirection active.")
    return httpServer
  }

  public async serve(config = this.serveConfig) {
    if (config.redirectFromPort) this.redirectHttp(this.serveConfig)
    const certs = await this.getCerts(config.domain)
    const serve = ServeStatic(process.cwd(), this.serverConfig)
    http2.createSecureServer(certs, (req, res) => serve(req as any, res as any, this.errorhandler(req, res, config)))
      .listen(config.port)
    // TODO: print only if no error
    console.info(`Serving ${config.rootDir} on https://${config.domain}:${config.port}`)
  }
}
