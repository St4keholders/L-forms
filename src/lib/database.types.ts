export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      form_collaborators: {
        Row: {
          email: string;
          form_id: string;
          invited_at: string;
          role: string;
        };
        Insert: {
          email: string;
          form_id: string;
          invited_at?: string;
          role?: string;
        };
        Update: {
          email?: string;
          form_id?: string;
          invited_at?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_collaborators_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      forms: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          owner_id: string;
          settings: Json;
          spreadsheet_id: string | null;
          status: string;
          theme: Json;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id: string;
          owner_id: string;
          settings?: Json;
          spreadsheet_id?: string | null;
          status?: string;
          theme?: Json;
          title?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          owner_id?: string;
          settings?: Json;
          spreadsheet_id?: string | null;
          status?: string;
          theme?: Json;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          name?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          answer_key: Json | null;
          config: Json;
          description: string;
          feedback: Json | null;
          form_id: string;
          go_to_section: Json | null;
          id: string;
          points: number | null;
          position: number;
          required: boolean;
          section_id: string;
          show_description: boolean;
          title: string;
          type: string;
        };
        Insert: {
          answer_key?: Json | null;
          config?: Json;
          description?: string;
          feedback?: Json | null;
          form_id: string;
          go_to_section?: Json | null;
          id: string;
          points?: number | null;
          position?: number;
          required?: boolean;
          section_id: string;
          show_description?: boolean;
          title?: string;
          type: string;
        };
        Update: {
          answer_key?: Json | null;
          config?: Json;
          description?: string;
          feedback?: Json | null;
          form_id?: string;
          go_to_section?: Json | null;
          id?: string;
          points?: number | null;
          position?: number;
          required?: boolean;
          section_id?: string;
          show_description?: boolean;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "sections";
            referencedColumns: ["id"];
          },
        ];
      };
      responses: {
        Row: {
          answers: Json;
          form_id: string;
          id: string;
          respondent_email: string | null;
          score: number | null;
          submitted_at: string;
          total_points: number | null;
        };
        Insert: {
          answers?: Json;
          form_id: string;
          id: string;
          respondent_email?: string | null;
          score?: number | null;
          submitted_at?: string;
          total_points?: number | null;
        };
        Update: {
          answers?: Json;
          form_id?: string;
          id?: string;
          respondent_email?: string | null;
          score?: number | null;
          submitted_at?: string;
          total_points?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      sections: {
        Row: {
          description: string;
          form_id: string;
          id: string;
          next_section: string | null;
          position: number;
          title: string;
        };
        Insert: {
          description?: string;
          form_id: string;
          id: string;
          next_section?: string | null;
          position?: number;
          title?: string;
        };
        Update: {
          description?: string;
          form_id?: string;
          id?: string;
          next_section?: string | null;
          position?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sections_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      user_google_tokens: {
        Row: {
          access_token: string | null;
          created_at: string;
          email: string | null;
          expiry_date: number | null;
          refresh_token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string;
          email?: string | null;
          expiry_date?: number | null;
          refresh_token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          created_at?: string;
          email?: string | null;
          expiry_date?: number | null;
          refresh_token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      form_is_published: { Args: { target_form_id: string }; Returns: boolean };
      get_form_sheet_credentials: {
        Args: { p_form_id: string };
        Returns: {
          refresh_token: string;
          spreadsheet_id: string;
        }[];
      };
      owns_form: { Args: { target_form_id: string }; Returns: boolean };
      save_user_google_token: {
        Args: {
          p_access_token: string | null;
          p_email: string | null;
          p_expiry_date: number | null;
          p_refresh_token: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
