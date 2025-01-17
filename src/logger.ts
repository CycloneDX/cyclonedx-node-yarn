/*!
This file is part of CycloneDX SBOM plugin for yarn.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

import type { BaseContext } from 'clipanion'

export class Logger {
  /** `true` if this logger instance was used to log any error message. */
  public didLogError = false

  /**
   * @param console Native console
   * @param logLevel Minimum log level for which outputting messages is desired.
   */
  constructor (private readonly console: Console, private readonly logLevel: number) {}

  private logWithPrefix (prefix: string, messageLogLevel: number, message: string, ...args: unknown[]): void {
    if (this.logLevel >= messageLogLevel) {
      this.console.log(`${prefix} | ${message}`, ...args)
    }
  }

  public info (message: string, ...args: unknown[]): void {
    this.logWithPrefix('INFO ', 2, message, ...args)
  }

  public debug (message: string, ...args: unknown[]): void {
    this.logWithPrefix('DEBUG', 3, message, ...args)
  }

  public warn (message: string, ...args: unknown[]): void {
    this.logWithPrefix('WARN ', 0, message, ...args)
  }

  public log (message: string, ...args: unknown[]): void {
    this.logWithPrefix('LOG  ', 1, message, ...args)
  }

  public error (message: string, ...args: unknown[]): void {
    this.didLogError = true
    this.logWithPrefix('ERROR', 0, message, ...args)
  }
}

export function makeConsoleLogger (level: number, context: BaseContext): Logger {
  // all output shall be bound to stdError - stdOut is for result output only
  const myConsole = new console.Console(context.stderr, context.stderr)
  return new Logger(myConsole, level)
}
