/* Copyright (c) 2015 - 2018, Nordic Semiconductor ASA
 *
 * All rights reserved.
 *
 * Use in source and binary forms, redistribution in binary form only, with
 * or without modification, are permitted provided that the following conditions
 * are met:
 *
 * 1. Redistributions in binary form, except as embedded into a Nordic
 *    Semiconductor ASA integrated circuit in a product or a software update for
 *    such product, must reproduce the above copyright notice, this list of
 *    conditions and the following disclaimer in the documentation and/or other
 *    materials provided with the distribution.
 *
 * 2. Neither the name of Nordic Semiconductor ASA nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 *
 * 3. This software, with or without modification, must only be used with a Nordic
 *    Semiconductor ASA integrated circuit.
 *
 * 4. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 *
 * THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 * TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const { EventCategory } = require('../utils')

const expect = /\+CPIN(R?): ?"?([A-Z ]+)"?(?:,([0-9]+))?/

const PINState = {
  READY: 'no PIN required',
  'SIM PIN': 'PIN code required',
  'SIM PUK': 'PUK code required',
  'SIM PIN2': 'PIN2 code required',
  'SIM PUK2': 'PUK2 code required'
}

function convertResponse (resp) {
  const r = expect.exec(resp)
  if (r) {
    const [, remaining, code, retries0] = r
    if (remaining) {
      const retries = parseInt(retries0, 10)
      return {
        id: 'pinRemaining',
        code,
        retries,
        message: `${code} remaining ${retries} retries`,
        category: EventCategory.EVENT
      }
    }
    return {
      id: 'pin',
      state: PINState[code],
      message: `${PINState[code] || code}`,
      category: EventCategory.EVENT
    }
  }
  return undefined
}

module.exports = target => {
  target.prototype.registerConverter(['+CPIN', '+CPINR'], convertResponse)

  Object.assign(target.prototype, {
    enterPIN (pin, newpin) {
      const pin2 = (typeof newpin === 'undefined') ? '' : `,"${newpin}"`
      return this.writeAT(`+CPIN="${pin}"${pin2}`)
    },
    checkPIN () {
      return this.writeAT('+CPIN?', {
        expect,
        processor: lines => convertResponse(lines.pop())
      })
    },
    getPINRetries () {
      return this.writeAT('+CPINR="SIM PIN"', {
        expect,
        processor: lines => convertResponse(lines.pop())
      })
    }
  })
}
