export const GROUP_CATEGORIES = [
  "General",
  "Sports",
  "Technology",
  "Music",
  "Art & Design",
  "Gaming",
  "Education",
  "Business",
  "Health & Fitness",
  "Food & Cooking",
  "Travel",
  "Science",
  "Books & Reading",
  "Movies & TV",
  "Photography",
] as const;

export type GroupCategory = (typeof GROUP_CATEGORIES)[number];

export const GROUP_CATEGORY_LABELS: Record<GroupCategory, string> = {
  "General": "Geral",
  "Sports": "Esportes",
  "Technology": "Tecnologia",
  "Music": "Música",
  "Art & Design": "Arte e Design",
  "Gaming": "Jogos",
  "Education": "Educação",
  "Business": "Negócios",
  "Health & Fitness": "Saúde e Fitness",
  "Food & Cooking": "Gastronomia",
  "Travel": "Viagem",
  "Science": "Ciência",
  "Books & Reading": "Livros e Leitura",
  "Movies & TV": "Filmes e TV",
  "Photography": "Fotografia",
};
