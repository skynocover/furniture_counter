import supabase from "./supabase";

// Define furniture type
export interface Furniture {
  id?: string;
  created_at?: string;
  name: string;
  type: string;
  description?: string;
  quantity: number;
  price?: number;
  location?: string;
}

// Furniture table operations
export const getFurniture = async (): Promise<Furniture[]> => {
  const { data, error } = await supabase
    .from("furniture")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching furniture:", error);
    return [];
  }

  return data || [];
};

export const getFurnitureById = async (
  id: string
): Promise<Furniture | null> => {
  const { data, error } = await supabase
    .from("furniture")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching furniture by id:", error);
    return null;
  }

  return data;
};

export const addFurniture = async (
  furniture: Omit<Furniture, "id" | "created_at">
): Promise<Furniture | null> => {
  const { data, error } = await supabase
    .from("furniture")
    .insert([furniture])
    .select();

  if (error) {
    console.error("Error adding furniture:", error);
    return null;
  }

  return data?.[0] || null;
};

export const updateFurniture = async (
  id: string,
  updates: Partial<Furniture>
): Promise<Furniture | null> => {
  const { data, error } = await supabase
    .from("furniture")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating furniture:", error);
    return null;
  }

  return data?.[0] || null;
};

export const deleteFurniture = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from("furniture").delete().eq("id", id);

  if (error) {
    console.error("Error deleting furniture:", error);
    return false;
  }

  return true;
};
