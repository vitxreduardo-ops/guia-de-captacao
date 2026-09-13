'use client'

import { Botao, Campo, Cena, useOlhar } from '@/components/Tatu'
import Link from 'next/link'
import { useRef, useState } from 'react'

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [foco, setFoco] = useState<'identificador' | 'senha' | null>(null)

  const cenaRef = useRef<HTMLDivElement>(null)
  const tapando = foco === 'senha'
  const { olhoX, olhoY } = useOlhar(cenaRef, tapando, foco !== null)

  // aceita e-mail ou nome de usuário: com "@" cobra formato de e-mail, senão só tamanho
  const pareceEmail = identificador.includes('@')
  const identificadorOk = pareceEmail
    ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identificador)
    : /^[a-z0-9._-]{3,}$/i.test(identificador.trim())
  const pronto = identificadorOk && senha.length >= 6

  const fala = tapando
    ? 'Digita à vontade, tô de olhos fechados.'
    : foco === 'identificador'
      ? identificadorOk
        ? 'Ah, te conheço.'
        : pareceEmail
          ? 'Esse e-mail ainda tá pela metade…'
          : 'E-mail ou usuário, tanto faz.'
      : pronto
        ? 'Pode entrar.'
        : 'Que bom te ver de novo.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#faf5ee,#f0e6d9)] px-6 py-16 text-neutral-900">
      <div className="w-full max-w-sm">
        <Cena cenaRef={cenaRef} olhoX={olhoX} olhoY={olhoY} tapando={tapando} feliz={pronto} fala={fala} />

        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">Entrar</h1>
        <p className="mt-1 text-[15px] leading-normal text-neutral-500">Entre com seu e-mail ou nome de usuário.</p>

        <form className="mt-7 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Campo
            label="E-mail ou usuário"
            autoComplete="username"
            value={identificador}
            onChange={setIdentificador}
            onFocus={() => setFoco('identificador')}
            onBlur={() => setFoco(null)}
          />
          <Campo
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={setSenha}
            onFocus={() => setFoco('senha')}
            onBlur={() => setFoco(null)}
          />

          <Botao type="submit" disabled={!pronto}>
            Entrar
          </Botao>
        </form>

        <p className="mt-6 text-center text-[14px] text-neutral-500">
          Ainda não tem conta?{' '}
          <Link href="/signup" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
