type GetWeekDaysParams = {
  short?: boolean
}

export function getWeekDays({ short = false }: GetWeekDaysParams = {}) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
  })

  return Array.from(Array(7).keys()).map((day) => {
    const weekDay = formatter.format(new Date(Date.UTC(2021, 5, day)))
    if (short) {
      return weekDay.substring(0, 3).toUpperCase()
    }

    return capitalize(weekDay)
  })
}

export function capitalize(text: string) {
  return text.substring(0, 1).toUpperCase().concat(text.substring(1))
}
