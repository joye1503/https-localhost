#!/usr/bin/env node

import { certificateFor } from "devcert"
import http2 from "http2"
import ServeStatic from "serve-static"
import finalhandler from "finalhandler"

interface ServeConfig {
  path: string,
  port: number,
  domain: string,
  redirect404To: string
}

class HttpsLocalhost {

  private serverConfig = {
    cacheControl: false,
    fallthrough: false
  }

  private serveConfig = {
    path: process.cwd(),
    port: 443,
    domain: "localhost",
    redirect404To: "/index.html"
  }

  private errorhandler(req: any, res: any, config: ServeConfig) {
    const p404 = config.path + config.redirect404To
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

  public getCerts(domain = "localhost") {
    return certificateFor(domain)
  }

  public async serve(config = this.serveConfig) {
    const certs = await this.getCerts(config.domain)
    const serve = ServeStatic(process.cwd(), this.serverConfig)
    http2.createSecureServer(certs, (req, res) => serve(req as any, res as any, this.errorhandler(req, res, config)))
      .listen(config.port)
    console.info(`Serving ${config.path} on https://${config.domain}:${config.port}`)
  }
}

if (require.main === module) {
  new HttpsLocalhost().serve()
}
