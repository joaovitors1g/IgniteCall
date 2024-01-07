import { useState } from 'react'
import { useRouter } from 'next/router'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'

import {
  Container,
  TimePicker,
  TimePickerHeader,
  TimePickerItem,
  TimePickerList,
} from './styles'
import { Calendar } from '@/src/components/Calendar'

import { api } from '@/src/lib/axios'

type Availability = {
  availability: number[]
  possibleTimes: number[]
}

type CalendarStepProps = {
  onSelectDateTime: (date: Date) => void
}

export function CalendarStep({ onSelectDateTime }: CalendarStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const router = useRouter()
  const weekDay = selectedDate ? dayjs(selectedDate).format('dddd') : ''

  const selectedDateWithoutTime = selectedDate
    ? dayjs(selectedDate).format('YYYY-MM-DD')
    : ''
  const isAnyDateSelected = !!selectedDate
  const username = String(router.query.username)

  const { data: availability } = useQuery<Availability>({
    queryKey: ['availability', username, selectedDateWithoutTime],
    queryFn: async () => {
      const { data } = await api.get<Availability>(
        `/users/${username}/availability?date=${selectedDateWithoutTime}`,
      )

      return data
    },
    enabled: !!selectedDate,
  })

  function handleSelectTime(hour: number) {
    const dateWithTime = dayjs(selectedDate)
      .set('hour', hour)
      .startOf('hour')
      .toDate()

    onSelectDateTime(dateWithTime)
  }

  const dayAndMonth = selectedDate
    ? dayjs(selectedDate).format('DD [de] MMMM')
    : ''

  return (
    <Container isTimePickerOpen={isAnyDateSelected}>
      <Calendar onDateSelected={setSelectedDate} />
      {isAnyDateSelected && (
        <TimePicker>
          <TimePickerHeader>
            {weekDay} <span>{dayAndMonth}</span>
          </TimePickerHeader>

          <TimePickerList>
            {availability?.possibleTimes.map((time) => {
              const formattedTime = `${String(time).padStart(2, '0')}:00h`
              const isDisabled = !availability.availability.includes(time)
              return (
                <TimePickerItem
                  key={formattedTime}
                  disabled={isDisabled}
                  onClick={() => handleSelectTime(time)}
                >
                  {formattedTime}
                </TimePickerItem>
              )
            })}
          </TimePickerList>
        </TimePicker>
      )}
    </Container>
  )
}
