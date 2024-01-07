import { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'
import { z } from 'zod'

import { prisma } from '@/src/lib/prisma'

const getAvailabilityQuerySchema = z.object({
  date: z.string().transform((date) => dayjs(date)),
  username: z.string(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const { username, date } = await getAvailabilityQuerySchema.parseAsync(
    req.query,
  )

  const isPastDate = date.endOf('day').isBefore(dayjs())

  if (isPastDate) {
    return res.json({
      availability: [],
    })
  }

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

  const userAvailability = await prisma.userTimeInterval.findFirst({
    where: {
      user_id: user.id,
      week_day: date.get('day'),
    },
  })

  if (!userAvailability) {
    return res.json({
      availability: [],
      possibleTimes: [],
    })
  }

  const { time_start_in_minutes, time_end_in_minutes } = userAvailability

  const startHour = Math.floor(time_start_in_minutes / 60)
  const endHour = Math.floor(time_end_in_minutes / 60)

  const possibleTimes = Array.from(
    { length: endHour - startHour },
    (_, index) => index + startHour,
  )

  const blockedTimes = await prisma.scheduling.findMany({
    select: {
      date: true,
    },
    where: {
      user_id: user.id,
      date: {
        gte: date.set('hour', startHour).toDate(),
        lte: date.set('hour', endHour).toDate(),
      },
    },
  })

  const availableTimes = possibleTimes.filter((time) => {
    const isTimeBlocked = blockedTimes.some(
      (blockedTime) => blockedTime.date.getHours() === time,
    )

    const isTimeInPast = date.set('hour', time).isBefore(dayjs())

    return !isTimeBlocked && !isTimeInPast
  })

  return res.json({
    availability: availableTimes,
    possibleTimes,
  })
}
