/**
 * The question bank.
 *
 * DEMO_DATA: in production this table lives server-side and the client is never
 * shipped the `answer` column before lock-in. The shape below is the shape the
 * table should have, including the editorial columns (`source`, `verifiedAt`)
 * that make a wrong number traceable to whoever wrote it.
 *
 * Every fact here is chosen to be *stable*: heights, distances, dates and
 * counts that do not move between the day a question is written and the day it
 * is served. Where a value does drift (populations, prices, site counts), the
 * prompt names the year and `verifiedAt` stamps the check.
 */

import type { Question, QuestionCategory, Unit } from "../types";

const M: Unit = { label: "m", placement: "suffix", decimals: 0, long: "metres" };
const M1: Unit = { label: "m", placement: "suffix", decimals: 1, long: "metres" };
const KM: Unit = { label: "km", placement: "suffix", decimals: 0, long: "kilometres" };
const KM_S: Unit = { label: "km/s", placement: "suffix", decimals: 0, long: "kilometres per second" };
const KMH: Unit = { label: "km/h", placement: "suffix", decimals: 0, long: "kilometres per hour" };
const MKM2: Unit = { label: "M km²", placement: "suffix", decimals: 2, long: "million square kilometres" };
const PERCENT: Unit = { label: "%", placement: "suffix", decimals: 0, long: "per cent" };
const CE: Unit = { label: "", placement: "suffix", decimals: 0, long: "CE", grouped: false };
const BCE: Unit = { label: "BCE", placement: "suffix", decimals: 0, long: "BCE", grouped: false };
const COUNT: Unit = { label: "", placement: "suffix", decimals: 0 };
const COUNT1: Unit = { label: "", placement: "suffix", decimals: 1 };
const DAYS: Unit = { label: "days", placement: "suffix", decimals: 0 };
const HOURS1: Unit = { label: "h", placement: "suffix", decimals: 1, long: "hours" };
const MINUTES: Unit = { label: "min", placement: "suffix", decimals: 0, long: "minutes" };
const SECONDS2: Unit = { label: "s", placement: "suffix", decimals: 2, long: "seconds" };
const YEARS: Unit = { label: "years", placement: "suffix", decimals: 0 };
const BN_YEARS: Unit = { label: "bn years", placement: "suffix", decimals: 1 };
const USD: Unit = { label: "$", placement: "prefix", decimals: 2 };
const USD_BN: Unit = { label: "$", placement: "prefix", decimals: 1, long: "billion US dollars" };
const MILLIONS: Unit = { label: "M", placement: "suffix", decimals: 1, long: "million" };
const BILLIONS: Unit = { label: "bn", placement: "suffix", decimals: 1, long: "billion" };
const KG: Unit = { label: "kg", placement: "suffix", decimals: 0, long: "kilograms" };

interface Draft {
  id: string;
  prompt: string;
  subtitle?: string;
  category: QuestionCategory;
  unit: Unit;
  answer: number;
  range: readonly [number, number];
  step: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  source: string;
  verifiedAt: string;
}

function build(draft: Draft): Question {
  return {
    id: draft.id,
    prompt: draft.prompt,
    ...(draft.subtitle === undefined ? {} : { subtitle: draft.subtitle }),
    category: draft.category,
    unit: draft.unit,
    answer: draft.answer,
    rangeStart: draft.range[0],
    rangeEnd: draft.range[1],
    step: draft.step,
    difficulty: draft.difficulty,
    source: draft.source,
    verifiedAt: draft.verifiedAt,
  };
}

const DRAFTS: readonly Draft[] = [
  // --- geography ------------------------------------------------------------
  { id: "geo-everest", prompt: "How tall is Mount Everest?", subtitle: "Height above sea level", category: "geography", unit: M, answer: 8849, range: [5000, 10000], step: 1, difficulty: 1, source: "Nepal-China joint survey, 2020", verifiedAt: "2026-02-01" },
  { id: "geo-nile", prompt: "How long is the Nile?", category: "geography", unit: KM, answer: 6650, range: [2000, 9000], step: 10, difficulty: 2, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "geo-mariana", prompt: "How deep is the Challenger Deep?", subtitle: "The lowest point of the Mariana Trench", category: "geography", unit: M, answer: 10935, range: [4000, 15000], step: 5, difficulty: 3, source: "NOAA / Five Deeps Expedition, 2019", verifiedAt: "2026-02-01" },
  { id: "geo-lhr-jfk", prompt: "How far is London from New York?", subtitle: "Great-circle distance, Heathrow to JFK", category: "geography", unit: KM, answer: 5570, range: [2000, 9000], step: 10, difficulty: 3, source: "Great-circle calculation", verifiedAt: "2026-02-01" },
  { id: "geo-russia-tz", prompt: "How many time zones does Russia span?", category: "geography", unit: COUNT, answer: 11, range: [1, 20], step: 1, difficulty: 2, source: "Russian Federal Law on Time Calculation", verifiedAt: "2026-02-01" },
  { id: "geo-lapaz", prompt: "How high is La Paz, Bolivia?", subtitle: "Elevation of the highest administrative capital", category: "geography", unit: M, answer: 3640, range: [500, 6000], step: 10, difficulty: 3, source: "Bolivian National Statistics Institute", verifiedAt: "2026-02-01" },
  { id: "geo-reef", prompt: "How long is the Great Barrier Reef?", category: "geography", unit: KM, answer: 2300, range: [200, 4000], step: 10, difficulty: 3, source: "Great Barrier Reef Marine Park Authority", verifiedAt: "2026-02-01" },
  { id: "geo-sahara", prompt: "How large is the Sahara?", category: "geography", unit: MKM2, answer: 9.2, range: [1, 20], step: 0.05, difficulty: 3, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "geo-australia", prompt: "How large is Australia?", subtitle: "Total land area", category: "geography", unit: MKM2, answer: 7.69, range: [1, 20], step: 0.05, difficulty: 2, source: "Geoscience Australia", verifiedAt: "2026-02-01" },
  { id: "geo-baikal", prompt: "How deep is Lake Baikal?", subtitle: "The deepest lake in the world", category: "geography", unit: M, answer: 1642, range: [100, 3000], step: 1, difficulty: 4, source: "Limnological Institute, Irkutsk", verifiedAt: "2026-02-01" },
  { id: "geo-angel", prompt: "How tall is Angel Falls?", category: "geography", unit: M, answer: 979, range: [50, 2000], step: 1, difficulty: 3, source: "Venezuelan Institute of Cartography", verifiedAt: "2026-02-01" },
  { id: "geo-greatwall", prompt: "How long is the Great Wall of China?", subtitle: "All branches and sections combined", category: "geography", unit: KM, answer: 21196, range: [1000, 40000], step: 10, difficulty: 4, source: "China State Administration of Cultural Heritage, 2012", verifiedAt: "2026-02-01" },
  { id: "geo-indonesia", prompt: "How many islands does Indonesia have?", category: "geography", unit: COUNT, answer: 17508, range: [500, 40000], step: 10, difficulty: 4, source: "Indonesian Ministry of Home Affairs", verifiedAt: "2026-02-01" },
  { id: "geo-vatican", prompt: "How large is Vatican City?", subtitle: "In hectares", category: "geography", unit: COUNT, answer: 49, range: [1, 500], step: 1, difficulty: 4, source: "Holy See Press Office", verifiedAt: "2026-02-01" },

  // --- history --------------------------------------------------------------
  { id: "his-berlin-wall", prompt: "When did the Berlin Wall fall?", category: "history", unit: CE, answer: 1989, range: [1900, 2000], step: 1, difficulty: 1, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-titanic", prompt: "When did the Titanic sink?", category: "history", unit: CE, answer: 1912, range: [1850, 1950], step: 1, difficulty: 1, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-great-fire", prompt: "When was the Great Fire of London?", category: "history", unit: CE, answer: 1666, range: [1400, 1800], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-apollo", prompt: "When did Apollo 11 land on the Moon?", category: "history", unit: CE, answer: 1969, range: [1930, 2000], step: 1, difficulty: 1, source: "NASA", verifiedAt: "2026-02-01" },
  { id: "his-magna-carta", prompt: "When was Magna Carta sealed?", category: "history", unit: CE, answer: 1215, range: [1000, 1500], step: 1, difficulty: 3, source: "British Library", verifiedAt: "2026-02-01" },
  { id: "his-rome-founded", prompt: "When was Rome founded?", subtitle: "By tradition, according to Varro", category: "history", unit: BCE, answer: 753, range: [1200, 200], step: 1, difficulty: 3, source: "Varro, via Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-great-pyramid", prompt: "When was the Great Pyramid of Giza completed?", subtitle: "Best archaeological estimate", category: "history", unit: BCE, answer: 2560, range: [4000, 1000], step: 10, difficulty: 4, source: "Egyptian Ministry of Tourism and Antiquities", verifiedAt: "2026-02-01" },
  { id: "his-gutenberg", prompt: "When was the Gutenberg Bible printed?", category: "history", unit: CE, answer: 1455, range: [1300, 1600], step: 1, difficulty: 4, source: "British Library", verifiedAt: "2026-02-01" },
  { id: "his-olympics", prompt: "When were the first modern Olympic Games held?", category: "history", unit: CE, answer: 1896, range: [1800, 1950], step: 1, difficulty: 2, source: "International Olympic Committee", verifiedAt: "2026-02-01" },
  { id: "his-ussr", prompt: "When was the Soviet Union dissolved?", category: "history", unit: CE, answer: 1991, range: [1950, 2010], step: 1, difficulty: 1, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-machu-picchu", prompt: "When was Machu Picchu built?", subtitle: "Accepted archaeological estimate", category: "history", unit: CE, answer: 1450, range: [1000, 1800], step: 5, difficulty: 4, source: "UNESCO World Heritage Centre", verifiedAt: "2026-02-01" },
  { id: "his-hundred-years", prompt: "When did the Hundred Years' War end?", category: "history", unit: CE, answer: 1453, range: [1200, 1600], step: 1, difficulty: 4, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-eiffel", prompt: "When was the Eiffel Tower completed?", category: "history", unit: CE, answer: 1889, range: [1800, 1950], step: 1, difficulty: 2, source: "Societe d'Exploitation de la Tour Eiffel", verifiedAt: "2026-02-01" },
  { id: "his-euro", prompt: "When did euro notes and coins enter circulation?", category: "history", unit: CE, answer: 2002, range: [1970, 2020], step: 1, difficulty: 2, source: "European Central Bank", verifiedAt: "2026-02-01" },

  // --- science --------------------------------------------------------------
  { id: "sci-light", prompt: "How fast does light travel in a vacuum?", category: "science", unit: KM_S, answer: 299792, range: [50000, 500000], step: 1, difficulty: 2, source: "BIPM, SI definition", verifiedAt: "2026-02-01" },
  { id: "sci-bones", prompt: "How many bones are in an adult human body?", category: "science", unit: COUNT, answer: 206, range: [50, 500], step: 1, difficulty: 2, source: "Gray's Anatomy", verifiedAt: "2026-02-01" },
  { id: "sci-moon", prompt: "How far away is the Moon?", subtitle: "Mean distance from Earth", category: "science", unit: KM, answer: 384400, range: [50000, 800000], step: 100, difficulty: 2, source: "NASA", verifiedAt: "2026-02-01" },
  { id: "sci-sun-surface", prompt: "How hot is the surface of the Sun?", subtitle: "Photosphere, in degrees Celsius", category: "science", unit: COUNT, answer: 5505, range: [1000, 12000], step: 5, difficulty: 3, source: "NASA Solar Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-chromosomes", prompt: "How many chromosomes are in a human body cell?", category: "science", unit: COUNT, answer: 46, range: [2, 120], step: 1, difficulty: 1, source: "National Human Genome Research Institute", verifiedAt: "2026-02-01" },
  { id: "sci-gold", prompt: "What is the atomic number of gold?", category: "science", unit: COUNT, answer: 79, range: [1, 118], step: 1, difficulty: 3, source: "IUPAC periodic table", verifiedAt: "2026-02-01" },
  { id: "sci-water-surface", prompt: "How much of Earth's surface is covered by water?", category: "science", unit: PERCENT, answer: 71, range: [0, 100], step: 1, difficulty: 1, source: "USGS", verifiedAt: "2026-02-01" },
  { id: "sci-mars-day", prompt: "How long is a day on Mars?", subtitle: "One sol, in Earth hours", category: "science", unit: HOURS1, answer: 24.6, range: [0, 72], step: 0.1, difficulty: 2, source: "NASA Mars Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-universe-age", prompt: "How old is the universe?", category: "science", unit: BN_YEARS, answer: 13.8, range: [1, 30], step: 0.1, difficulty: 2, source: "Planck collaboration, 2018", verifiedAt: "2026-02-01" },
  { id: "sci-elements", prompt: "How many elements are on the periodic table?", category: "science", unit: COUNT, answer: 118, range: [20, 250], step: 1, difficulty: 2, source: "IUPAC", verifiedAt: "2026-02-01" },
  { id: "sci-earth-diameter", prompt: "What is Earth's diameter at the equator?", category: "science", unit: KM, answer: 12756, range: [2000, 25000], step: 1, difficulty: 3, source: "NASA Earth Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-mercury-year", prompt: "How long is a year on Mercury?", subtitle: "In Earth days", category: "science", unit: DAYS, answer: 88, range: [1, 400], step: 1, difficulty: 3, source: "NASA Mercury Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-jwst", prompt: "What did the James Webb Space Telescope cost?", subtitle: "Total programme cost, in billions of US dollars", category: "science", unit: USD_BN, answer: 10, range: [0.5, 30], step: 0.1, difficulty: 3, source: "NASA, 2021", verifiedAt: "2026-02-01" },

  // --- culture --------------------------------------------------------------
  { id: "cul-piano", prompt: "How many keys are on a standard piano?", category: "culture", unit: COUNT, answer: 88, range: [20, 200], step: 1, difficulty: 1, source: "Steinway & Sons", verifiedAt: "2026-02-01" },
  { id: "cul-iphone", prompt: "When was the first iPhone released?", category: "culture", unit: CE, answer: 2007, range: [1990, 2020], step: 1, difficulty: 1, source: "Apple Inc.", verifiedAt: "2026-02-01" },
  { id: "cul-titanic-film", prompt: "How long is the film 'Titanic'?", subtitle: "1997 theatrical cut, in minutes", category: "culture", unit: MINUTES, answer: 194, range: [60, 300], step: 1, difficulty: 3, source: "British Board of Film Classification", verifiedAt: "2026-02-01" },
  { id: "cul-chess-openings", prompt: "How many opening moves can White play in chess?", category: "culture", unit: COUNT, answer: 20, range: [1, 100], step: 1, difficulty: 3, source: "FIDE Laws of Chess", verifiedAt: "2026-02-01" },
  { id: "cul-greek-alphabet", prompt: "How many letters are in the Greek alphabet?", category: "culture", unit: COUNT, answer: 24, range: [5, 60], step: 1, difficulty: 2, source: "Oxford Classical Dictionary", verifiedAt: "2026-02-01" },
  { id: "cul-potter", prompt: "When was the first Harry Potter book published?", category: "culture", unit: CE, answer: 1997, range: [1970, 2015], step: 1, difficulty: 2, source: "Bloomsbury Publishing", verifiedAt: "2026-02-01" },
  { id: "cul-unesco", prompt: "How many UNESCO World Heritage sites are there?", subtitle: "As of the 2024 session", category: "culture", unit: COUNT, answer: 1223, range: [100, 2500], step: 1, difficulty: 4, source: "UNESCO World Heritage Centre, 2024", verifiedAt: "2026-02-01" },
  { id: "cul-bayeux", prompt: "How long is the Bayeux Tapestry?", category: "culture", unit: M, answer: 68, range: [5, 200], step: 1, difficulty: 4, source: "Bayeux Museum", verifiedAt: "2026-02-01" },
  { id: "cul-eiffel-height", prompt: "How tall is the Eiffel Tower?", subtitle: "Including antennas", category: "culture", unit: M, answer: 330, range: [50, 700], step: 1, difficulty: 2, source: "Societe d'Exploitation de la Tour Eiffel", verifiedAt: "2026-02-01" },
  { id: "cul-abbey-road", prompt: "How many tracks are on The Beatles' 'Abbey Road'?", category: "culture", unit: COUNT, answer: 17, range: [1, 50], step: 1, difficulty: 4, source: "Apple Records original pressing", verifiedAt: "2026-02-01" },
  { id: "cul-statue-liberty", prompt: "How tall is the Statue of Liberty?", subtitle: "Ground to torch, including the pedestal", category: "culture", unit: M, answer: 93, range: [10, 250], step: 1, difficulty: 3, source: "US National Park Service", verifiedAt: "2026-02-01" },

  // --- sport ----------------------------------------------------------------
  { id: "spo-marathon", prompt: "How long is a marathon?", subtitle: "In metres", category: "sport", unit: M, answer: 42195, range: [10000, 60000], step: 5, difficulty: 2, source: "World Athletics", verifiedAt: "2026-02-01" },
  { id: "spo-hoop", prompt: "How high is a basketball hoop?", category: "sport", unit: M1, answer: 3.05, range: [1, 6], step: 0.01, difficulty: 2, source: "FIBA official basketball rules", verifiedAt: "2026-02-01" },
  { id: "spo-bolt", prompt: "What is the 100m world record?", subtitle: "Usain Bolt, Berlin 2009", category: "sport", unit: SECONDS2, answer: 9.58, range: [8, 12], step: 0.01, difficulty: 2, source: "World Athletics", verifiedAt: "2026-02-01" },
  { id: "spo-serena", prompt: "How many Grand Slam singles titles did Serena Williams win?", category: "sport", unit: COUNT, answer: 23, range: [1, 50], step: 1, difficulty: 3, source: "WTA Tour records", verifiedAt: "2026-02-01" },
  { id: "spo-world-cup", prompt: "When was the first FIFA World Cup held?", category: "sport", unit: CE, answer: 1930, range: [1870, 1980], step: 1, difficulty: 2, source: "FIFA", verifiedAt: "2026-02-01" },
  { id: "spo-rugby", prompt: "How many players are on a rugby union team?", subtitle: "On the pitch, per side", category: "sport", unit: COUNT, answer: 15, range: [5, 30], step: 1, difficulty: 1, source: "World Rugby Laws of the Game", verifiedAt: "2026-02-01" },
  { id: "spo-cricket-pitch", prompt: "How long is a cricket pitch?", subtitle: "Wicket to wicket, in yards", category: "sport", unit: COUNT, answer: 22, range: [5, 60], step: 1, difficulty: 3, source: "MCC Laws of Cricket", verifiedAt: "2026-02-01" },
  { id: "spo-tour", prompt: "How many stages are in the Tour de France?", category: "sport", unit: COUNT, answer: 21, range: [5, 45], step: 1, difficulty: 3, source: "Amaury Sport Organisation", verifiedAt: "2026-02-01" },

  // --- economy --------------------------------------------------------------
  { id: "eco-tokyo", prompt: "How many people live in the Tokyo metropolitan area?", subtitle: "In millions, 2024 estimate", category: "economy", unit: MILLIONS, answer: 37, range: [1, 60], step: 0.1, difficulty: 3, source: "UN World Urbanization Prospects, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-world-pop", prompt: "What is the world population?", subtitle: "In billions, 2024 estimate", category: "economy", unit: BILLIONS, answer: 8.1, range: [1, 15], step: 0.1, difficulty: 1, source: "UN Population Division, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-un", prompt: "How many member states does the United Nations have?", category: "economy", unit: COUNT, answer: 193, range: [50, 300], step: 1, difficulty: 2, source: "United Nations", verifiedAt: "2026-02-01" },
  { id: "eco-eu", prompt: "How many countries are in the European Union?", category: "economy", unit: COUNT, answer: 27, range: [5, 60], step: 1, difficulty: 1, source: "European Commission", verifiedAt: "2026-02-01" },
  { id: "eco-bigmac", prompt: "What does a Big Mac cost in the United States?", subtitle: "Big Mac Index, January 2024", category: "economy", unit: USD, answer: 5.69, range: [1, 15], step: 0.01, difficulty: 3, source: "The Economist Big Mac Index, Jan 2024", verifiedAt: "2026-02-01" },
  { id: "eco-mcdonalds", prompt: "How many McDonald's restaurants are there worldwide?", subtitle: "2023 company filing", category: "economy", unit: COUNT, answer: 41800, range: [1000, 100000], step: 100, difficulty: 4, source: "McDonald's Corporation 10-K, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-containers", prompt: "How many shipping containers are lost at sea each year?", subtitle: "Three-year rolling average", category: "economy", unit: COUNT, answer: 1566, range: [10, 10000], step: 1, difficulty: 5, source: "World Shipping Council, 2023", verifiedAt: "2026-02-01" },

  // --- nature ---------------------------------------------------------------
  { id: "nat-cheetah", prompt: "How fast can a cheetah run?", category: "nature", unit: KMH, answer: 110, range: [10, 250], step: 1, difficulty: 2, source: "Zoological Society of London", verifiedAt: "2026-02-01" },
  { id: "nat-blue-whale", prompt: "How long is a blue whale?", subtitle: "Largest reliably measured individual", category: "nature", unit: M1, answer: 30, range: [2, 60], step: 0.5, difficulty: 2, source: "NOAA Fisheries", verifiedAt: "2026-02-01" },
  { id: "nat-octopus", prompt: "How many hearts does an octopus have?", category: "nature", unit: COUNT, answer: 3, range: [1, 12], step: 1, difficulty: 2, source: "Marine Biological Association", verifiedAt: "2026-02-01" },
  { id: "nat-elephant", prompt: "How long is an African elephant pregnant?", category: "nature", unit: DAYS, answer: 645, range: [30, 1000], step: 5, difficulty: 3, source: "San Diego Zoo Wildlife Alliance", verifiedAt: "2026-02-01" },
  { id: "nat-giraffe", prompt: "How tall is an adult male giraffe?", category: "nature", unit: M1, answer: 5.5, range: [1, 12], step: 0.1, difficulty: 2, source: "Giraffe Conservation Foundation", verifiedAt: "2026-02-01" },
  { id: "nat-penguins", prompt: "How many species of penguin are there?", category: "nature", unit: COUNT, answer: 18, range: [1, 60], step: 1, difficulty: 4, source: "IUCN Red List", verifiedAt: "2026-02-01" },
  { id: "nat-sperm-whale", prompt: "How deep can a sperm whale dive?", category: "nature", unit: M, answer: 2000, range: [50, 4000], step: 10, difficulty: 4, source: "NOAA Fisheries", verifiedAt: "2026-02-01" },
  { id: "nat-methuselah", prompt: "How old is Methuselah, the bristlecone pine?", category: "nature", unit: YEARS, answer: 4850, range: [100, 10000], step: 10, difficulty: 4, source: "US Forest Service", verifiedAt: "2026-02-01" },
  { id: "nat-heart-beats", prompt: "How many times does a human heart beat in a day?", subtitle: "At an average resting rate", category: "nature", unit: COUNT, answer: 100000, range: [1000, 300000], step: 100, difficulty: 3, source: "British Heart Foundation", verifiedAt: "2026-02-01" },
  { id: "nat-blue-whale-heart", prompt: "How much does a blue whale's heart weigh?", category: "nature", unit: KG, answer: 180, range: [5, 600], step: 1, difficulty: 5, source: "Royal Ontario Museum specimen, 2014", verifiedAt: "2026-02-01" },
];

export const QUESTIONS: readonly Question[] = DRAFTS.map(build);

export const QUESTION_BY_ID: ReadonlyMap<string, Question> = new Map(
  QUESTIONS.map((question) => [question.id, question]),
);

export function getQuestion(id: string): Question | undefined {
  return QUESTION_BY_ID.get(id);
}

/** Strip the answer before anything reaches a screen that must not know it. */
export function toPublicQuestion(question: Question) {
  const { answer: _answer, lastUsedAt: _lastUsedAt, ...rest } = question;
  return rest;
}
