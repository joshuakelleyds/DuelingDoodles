import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_PROJECT_URL,
  import.meta.env.VITE_SUPABASE_PUBLIC_API_KEY
);

export const fetchLeaderboardData = async () => {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true });

    if (error) {
      throw error;
    }
    const transformedData = data.map(item => [
      item.id,
      item.rank,
      item.model,
      item.elo,
      item.avg_time,
      item.params,
      item.correct_guesses
    ]);
    return transformedData;
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return [];
  }
};

export const updateLeaderboardData = async (updatedLeaderboardData) => {
  try {
    const updates = updatedLeaderboardData.map(row => ({
      id: row[0],
      rank: row[1],
      elo: row[3],
      avg_time: row[4],
      correct_guesses: row[6]
    }));

    const { data, error } = await supabase
      .from('leaderboard')
      .upsert(updates, { onConflict: ['id'] });

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error updating leaderboard data:', error);
  }
};