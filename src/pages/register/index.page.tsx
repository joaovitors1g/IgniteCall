import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useForm } from 'react-hook-form'
import { Button, Heading, MultiStep, Text, TextInput } from '@ignite-ui/react'
import { isAxiosError } from 'axios'
import { ArrowRight } from 'phosphor-react'
import { z } from 'zod'
import { NextSeo } from 'next-seo'
import { zodResolver } from '@hookform/resolvers/zod'

import { api } from '@/src/lib/axios'
import { Container, Form, FormError, Header } from './styles'

const registerFormSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Mínimo de 3 caracteres' })
    .regex(/^([a-z\\-]+)$/i, {
      message: 'Apenas letras e hifens são permitidos',
    })
    .transform((value) => value.toLowerCase()),
  name: z.string().min(3, { message: 'Mínimo de 3 caracteres' }),
})

type RegisterFormData = z.infer<typeof registerFormSchema>

export default function Register() {
  const { query, push } = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  })

  useEffect(() => {
    if (query?.username) {
      setValue('username', String(query.username))
    }
  }, [query?.username, setValue])

  async function handleRegister(data: RegisterFormData) {
    try {
      await api.post('/users', data)

      await push('/register/connect-calendar')
    } catch (error) {
      if (isAxiosError(error) && error.response?.data.error) {
        const message = error.response.data.error as string
        alert(message)
        return
      }

      console.error(error)
    }
  }

  return (
    <>
      <NextSeo title="Crie uma conta" />
      <Container>
        <Header>
          <Heading as="strong">Bem-vindo ao Ignite Call!</Heading>
          <Text>
            Precisamos de algumas informações para criar seu perfil! Ah, você
            pode editar essas informações depois.
          </Text>

          <MultiStep size={4} currentStep={1} />
        </Header>

        <Form as="form" onSubmit={handleSubmit(handleRegister)}>
          <label>
            <Text size="sm">Nome de usuário</Text>
            <TextInput
              prefix="ignite.com/"
              placeholder="seu-usuario"
              {...register('username')}
            />
            {errors.username && (
              <FormError size="sm">{errors.username.message}</FormError>
            )}
          </label>
          <label>
            <Text size="sm">Nome completo</Text>
            <TextInput placeholder="Seu nome" {...register('name')} />
            {errors.name && (
              <FormError size="sm">{errors.name.message}</FormError>
            )}
          </label>

          <Button type="submit" disabled={isSubmitting}>
            Próximo passo
            <ArrowRight />
          </Button>
        </Form>
      </Container>
    </>
  )
}
