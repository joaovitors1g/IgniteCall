import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { prisma } from '@/src/lib/prisma'

type BlockedDatesQuery = {
  date: number
}

const getAvailabilityQuerySchema = z.object({
  year: z.coerce.number({
    required_error: 'Year is required',
    invalid_type_error: 'Year must be a number',
  }),
  month: z.coerce.number({
    required_error: 'Month is required',
    invalid_type_error: 'Month must be a number',
  }),
  username: z.string(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  const { username, year, month } = await getAvailabilityQuerySchema.parseAsync(
    req.query,
  )

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

  const availableWeekDays = await prisma.userTimeInterval.findMany({
    select: {
      week_day: true,
    },
    where: {
      user_id: user.id,
    },
  })

  const blockedWeekDays = [0, 1, 2, 3, 4, 5, 6].filter(
    (weekDay) =>
      !availableWeekDays.some(({ week_day }) => week_day === weekDay),
  )

  const blockedDatesRaw = await prisma.$queryRaw<BlockedDatesQuery[]>`
    SELECT CAST(EXTRACT(DAY FROM S.date) AS INTEGER) AS date,
    COUNT(S.date) AS amount,
    ((UTI.time_end_in_minutes - UTI.time_start_in_minutes) / 60) AS size
    FROM schedulings S
    LEFT JOIN user_time_intervals UTI
    ON UTI.week_day = EXTRACT(DOW FROM S.date)
    WHERE S.user_id = ${user.id}
    AND TO_CHAR(S.date, 'YYYY-MM') = ${`${year}-${String(month).padStart(
      2,
      '0',
    )}`}

    GROUP BY CAST(EXTRACT(DAY FROM S.date) AS INTEGER),
    ((UTI.time_end_in_minutes - UTI.time_start_in_minutes) / 60)
    HAVING COUNT(S.date) >= ((UTI.time_end_in_minutes - UTI.time_start_in_minutes) / 60)
  `

  const blockedDates = blockedDatesRaw.map(({ date }) => date)

  return res.json({
    blockedWeekDays,
    blockedDates,
  })
}
