export type DbUser = {
  id: string
  username: string
  instrument: string
  goal_min_monthly: number
  friend_code: string
  is_onboarded: boolean
  created_at: string
}

export type DbPracticeLog = {
  id: string
  user_id: string
  type: 'basic' | 'song'
  detail: string
  song_name: string
  duration_min: number
  memo: string
  one_word: string
  practiced_at: string  // YYYY-MM-DD
  created_at: string
}

export type DbUserSong = {
  id: string
  user_id: string
  title: string
  created_at: string
}

export type DbFriendRequest = {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

// 連続日数を計算する共通ユーティリティ
export function calcStreak(practicedDates: string[]): number {
  if (practicedDates.length === 0) return 0
  const dates = new Set(practicedDates)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const prev = (d: Date) => new Date(d.getTime() - 86400000)

  const todayStr = fmt(today)
  const yesterdayStr = fmt(prev(today))

  // 今日も昨日も練習していなければ streak = 0
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0

  let cur = dates.has(todayStr) ? today : prev(today)
  let streak = 0
  while (dates.has(fmt(cur))) {
    streak++
    cur = prev(cur)
  }
  return streak
}
