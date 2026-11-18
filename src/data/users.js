// People whose trips can be viewed. Each has one file, public/trips/<id>.csv, which is the only
// place their data lives. The app opens on the first person (Yili); switching lasts for the visit.
export const USERS = [
  { id: 'yili', name: 'Yili' },
  { id: 'kim', name: 'Kim' },
  { id: 'luyi', name: 'Luyi' },
]

export const csvPath = (user) => `trips/${user.id}.csv`
