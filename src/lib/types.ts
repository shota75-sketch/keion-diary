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
  bpm?: number
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
// practiced_at は UTC 日付文字列（YYYY-MM-DD）で保存されているため、
// 比較もすべて UTC ベースで統一する
export function calcStreak(practicedDates: string[]): number {
  if (practicedDates.length === 0) return 0
  const dates = new Set(practicedDates)

  const utcDay = (offsetDays: number) =>
    new Date(Date.now() - offsetDays * 86400000).toISOString().slice(0, 10)

  const todayStr     = utcDay(0)
  const yesterdayStr = utcDay(1)

  // 今日も昨日も練習していなければ streak = 0
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0

  let streak = 0
  let offset = dates.has(todayStr) ? 0 : 1
  while (dates.has(utcDay(offset))) {
    streak++
    offset++
  }
  return streak
}
