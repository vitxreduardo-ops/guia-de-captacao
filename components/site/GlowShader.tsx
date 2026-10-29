import { useEffect, useRef } from "react"

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`
// Brilho suave que segue o mouse, com ondulação lenta. Cores do Tatu: oliva e creme.
const FRAG = `
precision mediump float;
uniform vec2 res;uniform vec2 mouse;uniform float t;
void main(){
  vec2 uv=gl_FragCoord.xy/res;
  vec2 a=vec2(res.x/res.y,1.);
  vec2 d=(uv-mouse)*a;
  d+=0.035*vec2(sin(uv.y*7.+t*1.3),cos(uv.x*6.-t*1.1));
  float g=exp(-dot(d,d)*7.);
  float ring=exp(-pow(length(d)-0.28-0.03*sin(t*1.5),2.)*90.)*0.35;
  vec3 olive=vec3(.514,.502,.349);
  vec3 cream=vec3(1.,.965,.89);
  vec3 col=mix(olive,cream,g*g*.8);
  float al=clamp(g*.5+ring,0.,1.);
  gl_FragColor=vec4(col*al,al);
}`

/** Canvas WebGL que desenha o brilho. Só existe enquanto o mouse está em cima. */
export function GlowShader({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true })
    if (!gl) return

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "p")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "res")
    const uMouse = gl.getUniformLocation(prog, "mouse")
    const uT = gl.getUniformLocation(prog, "t")

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
      }
    }

    let raf = 0
    let sx = pointer.current.x
    let sy = pointer.current.y
    const start = performance.now()
    const frame = () => {
      fit()
      // o brilho persegue o mouse com atraso, para não ficar nervoso
      sx += (pointer.current.x - sx) * 0.12
      sy += (pointer.current.y - sy) * 0.12
      gl.uniform2f(uRes, canvas.width, canvas.height)
      gl.uniform2f(uMouse, sx, 1 - sy)
      gl.uniform1f(uT, (performance.now() - start) / 1000)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(frame)
    }
    frame()
    return () => {
      cancelAnimationFrame(raf)
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [pointer])

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
}
