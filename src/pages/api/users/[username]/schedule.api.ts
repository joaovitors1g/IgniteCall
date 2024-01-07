import { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'
import { z } from 'zod'
import { google } from 'googleapis'

import { prisma } from '@/src/lib/prisma'
import { getGoogleOauthToken } from '@/src/lib/google'

const createScheduleBodySchema = z.object({
  name: z.string(),
  email: z.string().email('Invalid email'),
  observations: z.string().nullable(),
  date: z
    .string()
    .datetime()
    .transform((date) => dayjs(date).startOf('hour'))
    .refine((date) => date.isAfter(dayjs()), {
      message: 'Cannot schedule a date in the past',
    }),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const username = String(req.query.username)

  const { name, email, observations, date } =
    await createScheduleBodySchema.parseAsync(req.body)

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  })

  if (!user) {
    return res.status(404).json({
      error: 'User not found',
    })
  }

  const conflictingSchedule = await prisma.scheduling.findFirst({
    where: {
      date: date.toDate(),
      user_id: user.id,
    },
  })

  if (conflictingSchedule) {
    return res.status(409).json({
      error: 'Schedule already taken',
    })
  }

  const scheduling = await prisma.scheduling.create({
    data: {
      date: date.toDate(),
      name,
      email,
      observations,
      user_id: user.id,
    },
  })

  const calendar = google.calendar({
    version: 'v3',
    auth: await getGoogleOauthToken(user.id),
  })

  await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: `Agendamento de ${name}`,
      description: observations,
      start: {
        dateTime: date.toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: date.add(1, 'hour').toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: [
        {
          email,
          displayName: name,
        },
      ],
      conferenceData: {
        createRequest: {
          requestId: scheduling.id,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    },
  })

  return res.json({})
}
