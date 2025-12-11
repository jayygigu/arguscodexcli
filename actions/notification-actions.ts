"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function markNotificationAsReadAction(formData: FormData) {
  const notificationId = formData.get("notificationId") as string

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error marking notification as read:", error)
      return { success: false, error: "Erreur lors de la mise à jour" }
    }

    revalidatePath("/agence/notifications")
    revalidatePath("/agence/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error in markNotificationAsReadAction:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteNotificationAction(formData: FormData) {
  const notificationId = formData.get("notificationId") as string

  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { error } = await supabase.from("notifications").delete().eq("id", notificationId).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting notification:", error)
      return { success: false, error: "Erreur lors de la suppression" }
    }

    revalidatePath("/agence/notifications")
    revalidatePath("/agence/dashboard")
    return { success: true }
  } catch (error: any) {
    console.error("Error in deleteNotificationAction:", error)
    return { success: false, error: error.message }
  }
}
