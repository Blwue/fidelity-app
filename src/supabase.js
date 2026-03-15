import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Charger les points d'un utilisateur
export async function loadUserPoints(userId) {
  const { data, error } = await supabase
    .from('shop-points')
    .select('*')
    .eq('user_id', userId)
  if (error) { console.error(error); return null; }
  return data;
}

// Sauvegarder ou mettre à jour les points
export async function saveUserPoints(userId, shopId, points, totalSpent, totalVisits) {
  const { data: existing } = await supabase
    .from('shop-points')
    .select('*')
    .eq('user_id', userId)
    .eq('shop_id', shopId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('shop-points')
      .update({ points, total_spent: totalSpent, total_visits: totalVisits })
      .eq('user_id', userId)
      .eq('shop_id', shopId)
    if (error) console.error(error);
  } else {
    const { error } = await supabase
      .from('shop-points')
      .insert({ user_id: userId, shop_id: shopId, points, total_spent: totalSpent, total_visits: totalVisits })
    if (error) console.error(error);
  }
}

// Sauvegarder une transaction
export async function saveTransaction(userId, shopId, amount, pointsEarned) {
  const { error } = await supabase
    .from('transactions')
    .insert({ user_id: userId, shop_id: shopId, amount, points_earned: pointsEarned })
  if (error) console.error(error);
}

// Créer le profil utilisateur
export async function createProfile(userId, name, email) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, name, email })
  if (error) console.error(error);
}