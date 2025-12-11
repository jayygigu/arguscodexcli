export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          owner_id: string
          name: string
          logo: string | null
          description: string | null
          contact_name: string
          contact_phone: string
          contact_email: string
          contact_address: string | null
          years_active: number | null
          active_investigators: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          logo?: string | null
          description?: string | null
          contact_name: string
          contact_phone: string
          contact_email: string
          contact_address?: string | null
          years_active?: number | null
          active_investigators?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["agencies"]["Insert"]>
      }
      agency_specialties: {
        Row: {
          id: string
          agency_id: string
          specialty:
            | "surveillance"
            | "investigation"
            | "background-check"
            | "fraud"
            | "corporate"
            | "filature"
            | "renseignement"
            | "infiltration"
            | "gardiennage"
            | "cyberenquete"
            | "audit-securite"
            | "intrusion"
            | "client-mystere"
            | "confirmation-physique"
            | "enquete-assurance"
            | "visite-pretexte"
            | "contre-surveillance"
          created_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          specialty: Database["public"]["Tables"]["agency_specialties"]["Row"]["specialty"]
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["agency_specialties"]["Insert"]>
      }
      mandates: {
        Row: {
          id: string
          title: string
          type: Database["public"]["Tables"]["agency_specialties"]["Row"]["specialty"]
          description: string
          city: string
          region: string
          postal_code: string
          latitude: number
          longitude: number
          date_posted: string | null
          date_required: string
          duration: string
          priority: "urgent" | "high" | "normal" | "low"
          budget: string | null
          agency_id: string
          status: "open" | "assigned" | "in-progress" | "completed" | "cancelled" | "expired"
          assignment_type: "direct" | "public"
          assigned_to: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          type: Database["public"]["Tables"]["mandates"]["Row"]["type"]
          description: string
          city: string
          region: string
          postal_code: string
          latitude: number
          longitude: number
          date_posted?: string | null
          date_required: string
          duration: string
          priority?: Database["public"]["Tables"]["mandates"]["Row"]["priority"]
          budget?: string | null
          agency_id: string
          status?: Database["public"]["Tables"]["mandates"]["Row"]["status"]
          assignment_type?: Database["public"]["Tables"]["mandates"]["Row"]["assignment_type"]
          assigned_to?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["mandates"]["Insert"]>
      }
      mandate_interests: {
        Row: {
          id: string
          mandate_id: string
          investigator_id: string
          status: "interested" | "accepted" | "rejected"
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          mandate_id: string
          investigator_id: string
          status?: Database["public"]["Tables"]["mandate_interests"]["Row"]["status"]
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["mandate_interests"]["Insert"]>
      }
      messages: {
        Row: {
          id: string
          mandate_id: string | null
          agency_id: string
          sender_id: string
          sender_name: string
          sender_type: "investigator" | "agency"
          content: string
          read: boolean | null
          delivered: boolean | null
          read_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          mandate_id?: string | null
          agency_id: string
          sender_id: string
          sender_name: string
          sender_type: Database["public"]["Tables"]["messages"]["Row"]["sender_type"]
          content: string
          read?: boolean | null
          delivered?: boolean | null
          read_at?: string | null
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          mandate_id: string | null
          title: string
          message: string
          type: "new-mandate" | "update" | "accepted" | "reminder" | "message"
          read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          mandate_id?: string | null
          title: string
          message: string
          type: Database["public"]["Tables"]["notifications"]["Row"]["type"]
          read?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>
      }
      profile_specialties: {
        Row: {
          id: string
          profile_id: string
          specialty: Database["public"]["Tables"]["agency_specialties"]["Row"]["specialty"]
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          specialty: Database["public"]["Tables"]["profile_specialties"]["Row"]["specialty"]
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["profile_specialties"]["Insert"]>
      }
      profiles: {
        Row: {
          id: string
          name: string
          license_number: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          region: string | null
          postal_code: string | null
          latitude: number | null
          longitude: number | null
          years_experience: number | null
          availability_status: "available" | "busy" | "unavailable" | null
          radius: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          name: string
          license_number?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          city?: string | null
          region?: string | null
          postal_code?: string | null
          latitude?: number | null
          longitude?: number | null
          years_experience?: number | null
          availability_status?: Database["public"]["Tables"]["profiles"]["Row"]["availability_status"]
          radius?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      unavailable_dates: {
        Row: {
          id: string
          profile_id: string
          date: string
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          date: string
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["unavailable_dates"]["Insert"]>
      }
      // New tables for stats and favorites
      investigator_stats: {
        Row: {
          id: string
          investigator_id: string
          total_mandates_completed: number | null
          total_mandates_in_progress: number | null
          average_rating: number | null
          total_ratings: number | null
          response_time_hours: number | null
          completion_rate: number | null
          on_time_rate: number | null
          last_mandate_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          investigator_id: string
          total_mandates_completed?: number | null
          total_mandates_in_progress?: number | null
          average_rating?: number | null
          total_ratings?: number | null
          response_time_hours?: number | null
          completion_rate?: number | null
          on_time_rate?: number | null
          last_mandate_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["investigator_stats"]["Insert"]>
      }
      investigator_favorites: {
        Row: {
          id: string
          agency_id: string
          investigator_id: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          investigator_id: string
          notes?: string | null
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["investigator_favorites"]["Insert"]>
      }
      mandate_ratings: {
        Row: {
          id: string
          mandate_id: string
          investigator_id: string
          agency_id: string
          rating: number
          comment: string | null
          on_time: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          mandate_id: string
          investigator_id: string
          agency_id: string
          rating: number
          comment?: string | null
          on_time?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["mandate_ratings"]["Insert"]>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

export type MandateStatus =
  | "open" // Public, pas d'enquêteur assigné
  | "assigned" // Enquêteur assigné, en attente de confirmation
  | "in-progress" // Enquêteur a confirmé, travail en cours
  | "completed" // Mandat terminé avec succès
  | "cancelled" // Mandat annulé
  | "expired" // Date dépassée sans complétion

export type CandidatureStatus =
  | "interested" // Candidature initiale
  | "accepted" // Acceptée par l'agence
  | "rejected" // Refusée par l'agence
  | "withdrawn" // Retirée par l'enquêteur
  | "expired" // Mandat déjà assigné à un autre

export type MandateTransition = {
  from: MandateStatus
  to: MandateStatus
  allowed: boolean
  requiresInvestigator?: boolean
}

export const MANDATE_WORKFLOW: MandateTransition[] = [
  { from: "open", to: "assigned", allowed: true, requiresInvestigator: true },
  { from: "open", to: "cancelled", allowed: true },
  { from: "open", to: "expired", allowed: true },
  { from: "assigned", to: "in-progress", allowed: true, requiresInvestigator: true },
  { from: "assigned", to: "open", allowed: true },
  { from: "assigned", to: "cancelled", allowed: true },
  { from: "in-progress", to: "completed", allowed: true, requiresInvestigator: true },
  { from: "in-progress", to: "cancelled", allowed: true },
  { from: "completed", to: "in-progress", allowed: false }, // Cannot reopen completed
]

export function canTransition(from: MandateStatus, to: MandateStatus): boolean {
  return MANDATE_WORKFLOW.some((t) => t.from === from && t.to === to && t.allowed)
}

export function requiresInvestigator(from: MandateStatus, to: MandateStatus): boolean {
  const transition = MANDATE_WORKFLOW.find((t) => t.from === from && t.to === to)
  return transition?.requiresInvestigator ?? false
}
