export type Condition = "New" | "Like New" | "Good" | "Fair";

export type Book = {
  id: string;
  title: string;
  /** ReRead's second-hand resale price — the ₹100–200 band. */
  price: number;
  /** Real new-book MRP, shown struck-through to highlight the saving. */
  originalPrice: number;
  /** Cover art in /public/covers, sourced from the real listing. */
  coverImage: string;
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
 * Real Class 11 & 12 premium textbooks (DK Goel, Pradeep's, HC Verma, TS
 * Grewal, Cengage, MTG, Oswaal…). Titles, publishers, MRPs and cover art were
 * pulled from the live product listings; `price` is ReRead's second-hand
 * resale (₹100–200), so every card shows a real, large saving vs `originalPrice`.
 * Seller/school counts here also drive the homepage stats bar automatically.
 */
export const BOOKS: Book[] = [
  {
    id: "book-1",
    title: "DK Goel Accountancy — Class 11 (APC)",
    price: 150,
    originalPrice: 980,
    coverImage: "/covers/dk-goel-accountancy-11.jpg",
    condition: "Good",
    subject: "Accountancy",
    className: "Class 11",
    board: "CBSE",
    publication: "APC Books",
    description:
      "The DK Goel Class 11 accountancy standard. All numericals worked out in pencil — keep them as solved examples or erase and redo. Syllabus unchanged, still current.",
    listedOn: "22 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Alex Kumar",
    sellerInitial: "A",
    views: 27,
  },
  {
    id: "book-2",
    title: "DK Goel Accountancy — Class 12, Part A Vol. I",
    price: 170,
    originalPrice: 780,
    coverImage: "/covers/dk-goel-accountancy-12.jpg",
    condition: "Like New",
    subject: "Accountancy",
    className: "Class 12",
    board: "CBSE",
    publication: "APC Books",
    description:
      "Accounting for Partnership Firms volume. Spine crisp, no missing pages. Cleared my boards with this — passing it forward to the next batch.",
    listedOn: "21 Jul 2026",
    school: "DAV Public School",
    sellerName: "Sneha Reddy",
    sellerInitial: "S",
    views: 19,
  },
  {
    id: "book-3",
    title: "T.S. Grewal Double Entry Book Keeping — Class 11",
    price: 160,
    originalPrice: 865,
    coverImage: "/covers/ts-grewal-accountancy-11.jpg",
    condition: "Good",
    subject: "Accountancy",
    className: "Class 11",
    board: "CBSE",
    publication: "Sultan Chand",
    description:
      "The standard practice book for Class 11 financial accounting. A few dog-eared pages, but every question and solution is fully legible.",
    listedOn: "20 Jul 2026",
    school: "Ryan International School",
    sellerName: "Karan Malhotra",
    sellerInitial: "K",
    views: 14,
  },
  {
    id: "book-4",
    title: "Sandeep Garg Introductory Macroeconomics — Class 12",
    price: 120,
    originalPrice: 635,
    coverImage: "/covers/sandeep-garg-macroeconomics-12.jpg",
    condition: "Like New",
    subject: "Economics",
    className: "Class 12",
    board: "CBSE",
    publication: "Dhanpat Rai",
    description:
      "Introductory Macroeconomics, the go-to for commerce boards. Only the first two chapters lightly highlighted — the rest is untouched.",
    listedOn: "19 Jul 2026",
    school: "Kendriya Vidyalaya",
    sellerName: "Priya Sharma",
    sellerInitial: "P",
    views: 11,
  },
  {
    id: "book-5",
    title: "T.R. Jain & V.K. Ohri Economics — Class 11 (Set of 2)",
    price: 190,
    originalPrice: 1152,
    coverImage: "/covers/tr-jain-economics-11.jpg",
    condition: "Like New",
    subject: "Economics",
    className: "Class 11",
    board: "CBSE",
    publication: "VK Global",
    description:
      "Full set — Introductory Microeconomics + Statistics for Economics. Bought new this year, switched streams, barely opened either book.",
    listedOn: "18 Jul 2026",
    school: "Kendriya Vidyalaya",
    sellerName: "Ananya Gupta",
    sellerInitial: "A",
    views: 22,
  },
  {
    id: "book-6",
    title: "Pradeep's Fundamental Physics — Class 11 (Vol 1 & 2)",
    price: 200,
    originalPrice: 1599,
    coverImage: "/covers/pradeep-physics-11.jpg",
    condition: "Fair",
    subject: "Physics",
    className: "Class 11",
    board: "CBSE",
    publication: "Pradeep Publications",
    description:
      "Both volumes — the thick set every PCM student knows. Covers taped at the corners, but the contents are complete and fully readable.",
    listedOn: "17 Jul 2026",
    school: "Ryan International School",
    sellerName: "Rohan Mehta",
    sellerInitial: "R",
    views: 25,
  },
  {
    id: "book-7",
    title: "Pradeep's New Course Chemistry — Class 12 (Vol 1 & 2)",
    price: 190,
    originalPrice: 1599,
    coverImage: "/covers/pradeep-chemistry-12.jpg",
    condition: "Good",
    subject: "Chemistry",
    className: "Class 12",
    board: "CBSE",
    publication: "Pradeep Publications",
    description:
      "Complete two-volume set. A few formula pages underlined, otherwise solid. Excellent for board theory and numericals alike.",
    listedOn: "16 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Aditya Nair",
    sellerInitial: "A",
    views: 16,
  },
  {
    id: "book-8",
    title: "Trueman's Elementary Biology Vol. I — Class 11",
    price: 150,
    originalPrice: 900,
    coverImage: "/covers/trueman-biology-11.jpg",
    condition: "Good",
    subject: "Biology",
    className: "Class 11",
    board: "CBSE",
    publication: "Trueman",
    description:
      "Volume I for Class 11 — the NEET biology staple. Diagrams clean, no torn pages, well looked after through the year.",
    listedOn: "15 Jul 2026",
    school: "St. Xavier's School",
    sellerName: "Meera Iyer",
    sellerInitial: "M",
    views: 13,
  },
  {
    id: "book-9",
    title: "H.C. Verma Concepts of Physics — Vol 1 & 2",
    price: 180,
    originalPrice: 1120,
    coverImage: "/covers/hc-verma-physics.jpg",
    condition: "Good",
    subject: "Physics",
    className: "Class 12",
    board: "JEE",
    publication: "Bharati Bhawan",
    description:
      "The legendary HCV set, both volumes. Heavy use but every exercise and answer is intact. JEE aspirants — this is the one to grab.",
    listedOn: "14 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Alex Kumar",
    sellerInitial: "A",
    views: 30,
  },
  {
    id: "book-10",
    title: "Cengage JEE Advanced Physics — Mechanics I",
    price: 160,
    originalPrice: 1099,
    coverImage: "/covers/cengage-physics-jee.jpg",
    condition: "Like New",
    subject: "Physics",
    className: "Class 11",
    board: "JEE",
    publication: "Cengage",
    description:
      "Cengage JEE Advanced Mechanics I (B.M. Sharma). The online concept-video code is unused. Ideal for serious JEE preparation.",
    listedOn: "13 Jul 2026",
    school: "Ryan International School",
    sellerName: "Karan Malhotra",
    sellerInitial: "K",
    views: 18,
  },
  {
    id: "book-11",
    title: "MTG NCERT at your Fingertips — Biology (NEET)",
    price: 140,
    originalPrice: 1099,
    coverImage: "/covers/mtg-fingertips-biology.jpg",
    condition: "Like New",
    subject: "Biology",
    className: "Class 12",
    board: "NEET",
    publication: "MTG",
    description:
      "15th edition, latest NEET pattern. Objective NCERT-based MCQs, mind maps and DPPs. Lightly used, no marks inside.",
    listedOn: "12 Jul 2026",
    school: "DAV Public School",
    sellerName: "Sneha Reddy",
    sellerInitial: "S",
    views: 21,
  },
  {
    id: "book-12",
    title: "Oswaal CBSE Physics Question Bank — Class 12",
    price: 130,
    originalPrice: 699,
    coverImage: "/covers/oswaal-physics-qb-12.jpg",
    condition: "Good",
    subject: "Physics",
    className: "Class 12",
    board: "CBSE",
    publication: "Oswaal",
    description:
      "Chapter & topic-wise solved papers (2017–2026). A must for board revision. A few pages flagged with sticky notes, otherwise clean.",
    listedOn: "11 Jul 2026",
    school: "Delhi Public School",
    sellerName: "Aditya Nair",
    sellerInitial: "A",
    views: 9,
  },
];

export function getBookById(id: string) {
  return BOOKS.find((book) => book.id === id);
}

/** Percentage saved vs the original MRP, e.g. 85 for ₹980 → ₹150. */
export function getDiscountPercent(book: Pick<Book, "price" | "originalPrice">) {
  return Math.round((1 - book.price / book.originalPrice) * 100);
}

export function getMarketplaceStats() {
  const schools = new Set(BOOKS.map((b) => b.school));
  const sellers = new Set(BOOKS.map((b) => b.sellerName));
  // Real money saved = the gap between MRP and ReRead's resale price.
  const moneySaved = BOOKS.reduce((sum, b) => sum + (b.originalPrice - b.price), 0);
  return {
    booksListed: BOOKS.length,
    activeStudents: sellers.size,
    moneySaved,
    schoolsConnected: schools.size,
  };
}
