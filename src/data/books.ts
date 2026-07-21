export type Condition = "New" | "Like New" | "Good" | "Fair";

export type Book = {
  id: string;
  title: string;
  price: number;
  condition: Condition;
  subject: string;
  className: string;
  board: string;
  publication: string;
  description: string;
  listedOn: string;
  school: string;
  sellerName: string;
  sellerInitial: string;
  views: number;
};

/**
 * Demo listings so the marketplace has something real to browse before
 * Milestone 3 (real listings) ships. Numbers here (schools, sellers) also
 * drive the homepage stats bar, so they stay in sync automatically.
 */
export const BOOKS: Book[] = [
  {
    id: "book-1",
    title: "H.C. Verma — Concepts of Physics Vol 1 & 2",
    price: 400,
    condition: "Good",
    subject: "Physics",
    className: "Class 12",
    board: "CBSE",
    publication: "Bharati Bhawan",
    description: "The legendary HCV set. Heavy use but all exercises intact. JEE aspirants, grab it!",
    listedOn: "20 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Alex Kumar",
    sellerInitial: "A",
    views: 24,
  },
  {
    id: "book-2",
    title: "Biology NCERT Class 12",
    price: 130,
    condition: "Like New",
    subject: "Biology",
    className: "Class 12",
    board: "CBSE",
    publication: "NCERT",
    description: "Barely used, no highlighting. Bought as a spare copy and never needed it.",
    listedOn: "18 Jul 2026",
    school: "Kendriya Vidyalaya",
    sellerName: "Priya Sharma",
    sellerInitial: "P",
    views: 11,
  },
  {
    id: "book-3",
    title: "English Core — Flamingo & Vistas",
    price: 90,
    condition: "New",
    subject: "English",
    className: "Class 12",
    board: "CBSE",
    publication: "NCERT",
    description: "Unopened, shrink wrap removed only to check the edition matches this year's syllabus.",
    listedOn: "19 Jul 2026",
    school: "Kendriya Vidyalaya",
    sellerName: "Priya Sharma",
    sellerInitial: "P",
    views: 8,
  },
  {
    id: "book-4",
    title: "NCERT Chemistry Class 12",
    price: 120,
    condition: "Good",
    subject: "Chemistry",
    className: "Class 12",
    board: "CBSE",
    publication: "NCERT",
    description: "Some pencil notes in the margins, all pages present, spine intact.",
    listedOn: "20 Jul 2026",
    school: "Ryan International School",
    sellerName: "Rohan Mehta",
    sellerInitial: "R",
    views: 6,
  },
  {
    id: "book-5",
    title: "Mathematics for Class 10 — R.D. Sharma",
    price: 180,
    condition: "Fair",
    subject: "Mathematics",
    className: "Class 10",
    board: "CBSE",
    publication: "Dhanpat Rai",
    description: "Well-loved copy, cover taped at the spine but every page is legible and complete.",
    listedOn: "14 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Alex Kumar",
    sellerInitial: "A",
    views: 15,
  },
  {
    id: "book-6",
    title: "ICSE Mathematics — Class 8",
    price: 120,
    condition: "Good",
    subject: "Mathematics",
    className: "Class 8",
    board: "ICSE",
    publication: "Selina",
    description: "Used for one term only, moved schools mid-year so barely touched after that.",
    listedOn: "12 Jul 2026",
    school: "St. Xavier's School",
    sellerName: "Meera Iyer",
    sellerInitial: "M",
    views: 9,
  },
  {
    id: "book-7",
    title: "State Board English — Class 9",
    price: 90,
    condition: "Like New",
    subject: "English",
    className: "Class 9",
    board: "State Board",
    publication: "State Board Press",
    description: "Kept in a cover the whole year. Looks close to new.",
    listedOn: "10 Jul 2026",
    school: "St. Xavier's School",
    sellerName: "Meera Iyer",
    sellerInitial: "M",
    views: 4,
  },
  {
    id: "book-8",
    title: "CBSE Biology — Class 11",
    price: 210,
    condition: "Good",
    subject: "Biology",
    className: "Class 11",
    board: "CBSE",
    publication: "NCERT",
    description: "Diagrams neatly labelled in pencil — actually useful if you're studying from it, not distracting.",
    listedOn: "16 Jul 2026",
    school: "Ryan International School",
    sellerName: "Rohan Mehta",
    sellerInitial: "R",
    views: 13,
  },
];

export function getBookById(id: string) {
  return BOOKS.find((book) => book.id === id);
}

export function getMarketplaceStats() {
  const schools = new Set(BOOKS.map((b) => b.school));
  const sellers = new Set(BOOKS.map((b) => b.sellerName));
  const moneySaved = BOOKS.reduce((sum, b) => sum + b.price, 0);
  return {
    booksListed: BOOKS.length,
    activeStudents: sellers.size,
    moneySaved,
    schoolsConnected: schools.size,
  };
}
