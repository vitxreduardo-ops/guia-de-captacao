'use client'

import { Botao, Campo, Cena, useOlhar } from '@/components/Tatu'
import Link from 'next/link'
import { useRef, useState } from 'react'

export default function SignupPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [foco, setFoco] = useState<'nome' | 'email' | 'senha' | null>(null)

  const cenaRef = useRef<HTMLDivElement>(null)
  const tapando = foco === 'senha'
  const { olhoX, olhoY } = useOlhar(cenaRef, tapando, foco !== null)

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const forte = senha.length >= 8
  const pronto = nome.trim().length > 1 && emailOk && senha.length >= 6

  const fala = tapando
    ? forte
      ? 'Não tô olhando. E essa senha tá boa.'
      : 'Não tô olhando, prometo.'
    : foco === 'nome'
      ? nome.trim()
        ? `Prazer, ${nome.trim().split(' ')[0]}.`
        : 'Como te chamo?'
      : foco === 'email'
        ? emailOk
          ? 'E-mail certinho.'
          : 'Esse e-mail ainda tá pela metade…'
        : pronto
          ? 'Tudo pronto. Bora?'
          : 'Vamos criar sua conta.'

  return (
    <main className="flex min-h-svh items-center justify-center bg-[linear-gradient(180deg,#faf5ee,#f0e6d9)] px-6 py-16 text-neutral-900">
      <div className="w-full max-w-sm">
        <Cena cenaRef={cenaRef} olhoX={olhoX} olhoY={olhoY} tapando={tapando} feliz={pronto} fala={fala} />

        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">Criar conta</h1>
        <p className="mt-1 text-[15px] leading-normal text-neutral-500">Leva dois minutos.</p>

        <form className="mt-7 space-y-4" onSubmit={(e) => e.preventDefault()}>
          <Campo
            label="Nome completo"
            autoComplete="name"
            value={nome}
            onChange={setNome}
            onFocus={() => setFoco('nome')}
            onBlur={() => setFoco(null)}
          />
          <Campo
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onFocus={() => setFoco('email')}
            onBlur={() => setFoco(null)}
          />
          <Campo
            label="Senha"
            type="password"
            autoComplete="new-password"
            hint="Mínimo 6 caracteres"
            value={senha}
            onChange={setSenha}
            onFocus={() => setFoco('senha')}
            onBlur={() => setFoco(null)}
          />

          <Botao type="submit" disabled={!pronto}>
            Criar conta
          </Botao>
        </form>

        <p className="mt-6 text-center text-[14px] text-neutral-500">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
