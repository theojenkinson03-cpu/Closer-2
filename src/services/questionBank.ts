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
const G: Unit = { label: "g", placement: "suffix", decimals: 0, long: "grams" };
const G1: Unit = { label: "g", placement: "suffix", decimals: 1, long: "grams" };
const CM: Unit = { label: "cm", placement: "suffix", decimals: 0, long: "centimetres" };
const MM: Unit = { label: "mm", placement: "suffix", decimals: 0, long: "millimetres" };
const FT: Unit = { label: "ft", placement: "suffix", decimals: 0, long: "feet" };
const CELSIUS: Unit = { label: "\u00B0C", placement: "suffix", decimals: 0, long: "degrees Celsius" };
const CELSIUS1: Unit = { label: "\u00B0C", placement: "suffix", decimals: 1, long: "degrees Celsius" };
const MPS: Unit = { label: "m/s", placement: "suffix", decimals: 0, long: "metres per second" };
const LITRES1: Unit = { label: "L", placement: "suffix", decimals: 1, long: "litres" };
const NM: Unit = { label: "nm", placement: "suffix", decimals: 0, long: "nanometres" };
const LY2: Unit = { label: "ly", placement: "suffix", decimals: 2, long: "light years" };
const MONTHS: Unit = { label: "months", placement: "suffix", decimals: 0 };
const OZ: Unit = { label: "oz", placement: "suffix", decimals: 0, long: "ounces" };
const HPA: Unit = { label: "hPa", placement: "suffix", decimals: 0, long: "hectopascals" };
const CENTS: Unit = { label: "\u00A2", placement: "suffix", decimals: 0, long: "cents" };
const USD_T: Unit = { label: "$", placement: "prefix", decimals: 2, long: "trillion US dollars" };
const USD_K: Unit = { label: "$", placement: "prefix", decimals: 0, long: "thousand US dollars" };
const COUNT2: Unit = { label: "", placement: "suffix", decimals: 2 };
const MILLIONS0: Unit = { label: "M", placement: "suffix", decimals: 0, long: "million" };
const BILLIONS2: Unit = { label: "bn", placement: "suffix", decimals: 2, long: "billion" };

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
  { id: "sci-sun-surface", prompt: "How hot is the surface of the Sun?", subtitle: "The photosphere", category: "science", unit: CELSIUS, answer: 5505, range: [1000, 12000], step: 5, difficulty: 3, source: "NASA Solar Fact Sheet", verifiedAt: "2026-02-01" },
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
  // --- geography (expansion) ------------------------------------------------
  { id: "geo-amazon", prompt: "How long is the Amazon?", category: "geography", unit: KM, answer: 6400, range: [1000, 9000], step: 10, difficulty: 3, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "geo-kilimanjaro", prompt: "How tall is Kilimanjaro?", category: "geography", unit: M, answer: 5895, range: [1000, 9000], step: 1, difficulty: 2, source: "Tanzania National Parks", verifiedAt: "2026-02-01" },
  { id: "geo-greenland", prompt: "How large is Greenland?", category: "geography", unit: MKM2, answer: 2.17, range: [0.1, 6], step: 0.01, difficulty: 3, source: "Statistics Greenland", verifiedAt: "2026-02-01" },
  { id: "geo-grand-canyon", prompt: "How deep is the Grand Canyon?", subtitle: "At its deepest point", category: "geography", unit: M, answer: 1800, range: [100, 4000], step: 10, difficulty: 3, source: "US National Park Service", verifiedAt: "2026-02-01" },
  { id: "geo-panama", prompt: "How long is the Panama Canal?", category: "geography", unit: KM, answer: 82, range: [5, 400], step: 1, difficulty: 3, source: "Panama Canal Authority", verifiedAt: "2026-02-01" },
  { id: "geo-suez", prompt: "How long is the Suez Canal?", category: "geography", unit: KM, answer: 193, range: [10, 600], step: 1, difficulty: 3, source: "Suez Canal Authority", verifiedAt: "2026-02-01" },
  { id: "geo-fuji", prompt: "How tall is Mount Fuji?", category: "geography", unit: M, answer: 3776, range: [500, 7000], step: 1, difficulty: 2, source: "Geospatial Information Authority of Japan", verifiedAt: "2026-02-01" },
  { id: "geo-mediterranean", prompt: "How large is the Mediterranean Sea?", category: "geography", unit: MKM2, answer: 2.5, range: [0.1, 12], step: 0.05, difficulty: 4, source: "International Hydrographic Organization", verifiedAt: "2026-02-01" },
  { id: "geo-africa-countries", prompt: "How many countries are in Africa?", category: "geography", unit: COUNT, answer: 54, range: [5, 120], step: 1, difficulty: 2, source: "African Union", verifiedAt: "2026-02-01" },
  { id: "geo-trans-siberian", prompt: "How long is the Trans-Siberian Railway?", subtitle: "Moscow to Vladivostok", category: "geography", unit: KM, answer: 9289, range: [1000, 16000], step: 1, difficulty: 4, source: "Russian Railways", verifiedAt: "2026-02-01" },
  { id: "geo-hottest", prompt: "What is the hottest air temperature ever recorded?", subtitle: "Death Valley, California, 1913", category: "geography", unit: CELSIUS1, answer: 56.7, range: [20, 90], step: 0.1, difficulty: 3, source: "World Meteorological Organization", verifiedAt: "2026-02-01" },
  { id: "geo-coldest", prompt: "What is the coldest air temperature ever recorded?", subtitle: "Vostok Station, Antarctica, 1983", category: "geography", unit: CELSIUS1, answer: -89.2, range: [-110, 0], step: 0.1, difficulty: 3, source: "World Meteorological Organization", verifiedAt: "2026-02-01" },
  { id: "geo-maldives", prompt: "How many islands does the Maldives have?", category: "geography", unit: COUNT, answer: 1192, range: [50, 4000], step: 1, difficulty: 4, source: "Maldives Bureau of Statistics", verifiedAt: "2026-02-01" },
  { id: "geo-dead-sea", prompt: "How far below sea level is the shore of the Dead Sea?", category: "geography", unit: M, answer: -430, range: [-700, 0], step: 1, difficulty: 3, source: "Israel Hydrological Service", verifiedAt: "2026-02-01" },
  { id: "geo-superior", prompt: "How large is Lake Superior?", subtitle: "Surface area, the largest freshwater lake by area", category: "geography", unit: COUNT, answer: 82100, range: [5000, 250000], step: 100, difficulty: 4, source: "US Environmental Protection Agency", verifiedAt: "2026-02-01" },
  { id: "geo-table-mountain", prompt: "How tall is Table Mountain?", category: "geography", unit: M, answer: 1086, range: [100, 3000], step: 1, difficulty: 3, source: "South African National Parks", verifiedAt: "2026-02-01" },
  { id: "geo-karman", prompt: "How high is the Karman line?", subtitle: "The conventional boundary of space", category: "geography", unit: KM, answer: 100, range: [10, 600], step: 1, difficulty: 3, source: "Federation Aeronautique Internationale", verifiedAt: "2026-02-01" },
  { id: "geo-danube", prompt: "How long is the Danube?", category: "geography", unit: KM, answer: 2850, range: [200, 6000], step: 10, difficulty: 4, source: "International Commission for the Protection of the Danube River", verifiedAt: "2026-02-01" },
  { id: "geo-antarctica", prompt: "How large is Antarctica?", category: "geography", unit: MKM2, answer: 14, range: [1, 40], step: 0.1, difficulty: 3, source: "British Antarctic Survey", verifiedAt: "2026-02-01" },
  { id: "geo-gibraltar", prompt: "How narrow is the Strait of Gibraltar at its narrowest?", category: "geography", unit: KM, answer: 13, range: [1, 120], step: 1, difficulty: 4, source: "International Hydrographic Organization", verifiedAt: "2026-02-01" },
  { id: "geo-brazil-borders", prompt: "How many countries does Brazil border?", category: "geography", unit: COUNT, answer: 10, range: [1, 25], step: 1, difficulty: 3, source: "Brazilian Institute of Geography and Statistics", verifiedAt: "2026-02-01" },
  { id: "geo-us-canada-border", prompt: "How long is the border between the United States and Canada?", category: "geography", unit: KM, answer: 8891, range: [1000, 18000], step: 1, difficulty: 4, source: "International Boundary Commission", verifiedAt: "2026-02-01" },
  { id: "geo-channel-depth", prompt: "How deep is the English Channel at its deepest?", category: "geography", unit: M, answer: 174, range: [20, 600], step: 1, difficulty: 5, source: "UK Hydrographic Office", verifiedAt: "2026-02-01" },

  // --- history (expansion) --------------------------------------------------
  { id: "his-hastings", prompt: "When was the Battle of Hastings?", category: "history", unit: CE, answer: 1066, range: [800, 1300], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-french-revolution", prompt: "When did the French Revolution begin?", category: "history", unit: CE, answer: 1789, range: [1500, 1900], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-declaration", prompt: "When was the American Declaration of Independence signed?", category: "history", unit: CE, answer: 1776, range: [1600, 1900], step: 1, difficulty: 1, source: "US National Archives", verifiedAt: "2026-02-01" },
  { id: "his-ww1", prompt: "When did the First World War begin?", category: "history", unit: CE, answer: 1914, range: [1800, 1960], step: 1, difficulty: 1, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-ww2-end", prompt: "When did the Second World War end?", category: "history", unit: CE, answer: 1945, range: [1880, 1990], step: 1, difficulty: 1, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-black-death", prompt: "When did the Black Death reach England?", category: "history", unit: CE, answer: 1348, range: [1100, 1600], step: 1, difficulty: 4, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-columbus", prompt: "When did Columbus first reach the Americas?", category: "history", unit: CE, answer: 1492, range: [1200, 1700], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-rome-fell", prompt: "When did the Western Roman Empire fall?", subtitle: "The deposition of Romulus Augustulus", category: "history", unit: CE, answer: 476, range: [100, 900], step: 1, difficulty: 4, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-pompeii", prompt: "When did Vesuvius bury Pompeii?", category: "history", unit: CE, answer: 79, range: [1, 400], step: 1, difficulty: 3, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-parthenon", prompt: "When was the Parthenon completed?", category: "history", unit: BCE, answer: 432, range: [900, 100], step: 1, difficulty: 4, source: "Acropolis Museum", verifiedAt: "2026-02-01" },
  { id: "his-alexander", prompt: "When did Alexander the Great die?", category: "history", unit: BCE, answer: 323, range: [700, 50], step: 1, difficulty: 4, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-qin-wall", prompt: "When were the first sections of the Great Wall begun?", subtitle: "Under the Qin dynasty", category: "history", unit: BCE, answer: 221, range: [800, 50], step: 1, difficulty: 5, source: "China State Administration of Cultural Heritage", verifiedAt: "2026-02-01" },
  { id: "his-cleopatra", prompt: "When did Cleopatra die?", category: "history", unit: BCE, answer: 30, range: [400, 1], step: 1, difficulty: 4, source: "Encyclopaedia Britannica", verifiedAt: "2026-02-01" },
  { id: "his-armada", prompt: "When did the Spanish Armada sail against England?", category: "history", unit: CE, answer: 1588, range: [1300, 1800], step: 1, difficulty: 3, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-waterloo", prompt: "When was the Battle of Waterloo?", category: "history", unit: CE, answer: 1815, range: [1600, 1950], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-wright", prompt: "When did the Wright brothers first fly?", category: "history", unit: CE, answer: 1903, range: [1800, 1970], step: 1, difficulty: 2, source: "Smithsonian National Air and Space Museum", verifiedAt: "2026-02-01" },
  { id: "his-chernobyl", prompt: "When was the Chernobyl disaster?", category: "history", unit: CE, answer: 1986, range: [1930, 2020], step: 1, difficulty: 2, source: "International Atomic Energy Agency", verifiedAt: "2026-02-01" },
  { id: "his-mandela", prompt: "When was Nelson Mandela released from prison?", category: "history", unit: CE, answer: 1990, range: [1940, 2020], step: 1, difficulty: 2, source: "Nelson Mandela Foundation", verifiedAt: "2026-02-01" },
  { id: "his-suez-opened", prompt: "When did the Suez Canal open?", category: "history", unit: CE, answer: 1869, range: [1700, 1980], step: 1, difficulty: 3, source: "Suez Canal Authority", verifiedAt: "2026-02-01" },
  { id: "his-liberty-dedicated", prompt: "When was the Statue of Liberty dedicated?", category: "history", unit: CE, answer: 1886, range: [1750, 1980], step: 1, difficulty: 3, source: "US National Park Service", verifiedAt: "2026-02-01" },
  { id: "his-versailles", prompt: "When was the Treaty of Versailles signed?", category: "history", unit: CE, answer: 1919, range: [1800, 1980], step: 1, difficulty: 2, source: "Historical record", verifiedAt: "2026-02-01" },
  { id: "his-hagia-sophia", prompt: "When was the Hagia Sophia completed?", subtitle: "Justinian's church, the building that stands today", category: "history", unit: CE, answer: 537, range: [100, 1100], step: 1, difficulty: 5, source: "UNESCO World Heritage Centre", verifiedAt: "2026-02-01" },
  { id: "his-first-email", prompt: "When was the first email sent between computers?", subtitle: "Ray Tomlinson, on ARPANET", category: "history", unit: CE, answer: 1971, range: [1900, 2010], step: 1, difficulty: 4, source: "Internet Hall of Fame", verifiedAt: "2026-02-01" },
  // --- science (expansion) --------------------------------------------------
  { id: "sci-nitrogen-boil", prompt: "At what temperature does nitrogen boil?", category: "science", unit: CELSIUS, answer: -196, range: [-260, 20], step: 1, difficulty: 3, source: "NIST", verifiedAt: "2026-02-01" },
  { id: "sci-mercury-freeze", prompt: "At what temperature does mercury freeze?", category: "science", unit: CELSIUS, answer: -39, range: [-120, 60], step: 1, difficulty: 4, source: "NIST", verifiedAt: "2026-02-01" },
  { id: "sci-sun-diameter", prompt: "What is the diameter of the Sun?", category: "science", unit: KM, answer: 1392700, range: [100000, 3500000], step: 100, difficulty: 3, source: "NASA Sun Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-earth-mass", prompt: "What is the mass of the Earth?", subtitle: "In units of 10^24 kilograms", category: "science", unit: COUNT2, answer: 5.97, range: [0.5, 25], step: 0.01, difficulty: 4, source: "NASA Earth Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-sound-speed", prompt: "How fast does sound travel in air?", subtitle: "At 20 degrees Celsius, at sea level", category: "science", unit: MPS, answer: 343, range: [50, 1200], step: 1, difficulty: 2, source: "NIST", verifiedAt: "2026-02-01" },
  { id: "sci-blood-volume", prompt: "How much blood is in an adult human body?", category: "science", unit: LITRES1, answer: 5, range: [0.5, 18], step: 0.1, difficulty: 2, source: "American Red Cross", verifiedAt: "2026-02-01" },
  { id: "sci-dna-length", prompt: "How long is the DNA in a single human cell, uncoiled?", category: "science", unit: M1, answer: 2, range: [0.1, 12], step: 0.1, difficulty: 4, source: "National Human Genome Research Institute", verifiedAt: "2026-02-01" },
  { id: "sci-neurons", prompt: "How many neurons are in the human brain?", subtitle: "In billions", category: "science", unit: BILLIONS, answer: 86, range: [1, 400], step: 1, difficulty: 3, source: "Azevedo et al., Journal of Comparative Neurology, 2009", verifiedAt: "2026-02-01" },
  { id: "sci-sun-core", prompt: "How hot is the core of the Sun?", subtitle: "In millions of degrees Celsius", category: "science", unit: MILLIONS0, answer: 15, range: [1, 90], step: 1, difficulty: 3, source: "NASA Solar Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-proxima", prompt: "How far away is Proxima Centauri?", category: "science", unit: LY2, answer: 4.24, range: [0.5, 25], step: 0.01, difficulty: 3, source: "European Space Agency", verifiedAt: "2026-02-01" },
  { id: "sci-baby-bones", prompt: "How many bones is a baby born with?", category: "science", unit: COUNT, answer: 270, range: [50, 600], step: 1, difficulty: 4, source: "Gray's Anatomy", verifiedAt: "2026-02-01" },
  { id: "sci-carbon-14", prompt: "What is the half-life of carbon-14?", category: "science", unit: YEARS, answer: 5730, range: [100, 25000], step: 10, difficulty: 4, source: "IUPAC", verifiedAt: "2026-02-01" },
  { id: "sci-pressure", prompt: "What is atmospheric pressure at sea level?", category: "science", unit: HPA, answer: 1013, range: [200, 2000], step: 1, difficulty: 3, source: "World Meteorological Organization", verifiedAt: "2026-02-01" },
  { id: "sci-nitrogen-share", prompt: "How much of the atmosphere is nitrogen?", category: "science", unit: PERCENT, answer: 78, range: [0, 100], step: 1, difficulty: 2, source: "NOAA", verifiedAt: "2026-02-01" },
  { id: "sci-iss-orbit", prompt: "How long does the International Space Station take to orbit Earth?", category: "science", unit: MINUTES, answer: 93, range: [10, 400], step: 1, difficulty: 3, source: "NASA", verifiedAt: "2026-02-01" },
  { id: "sci-iss-altitude", prompt: "How high does the International Space Station orbit?", category: "science", unit: KM, answer: 408, range: [50, 1500], step: 1, difficulty: 3, source: "NASA", verifiedAt: "2026-02-01" },
  { id: "sci-moon-gravity", prompt: "How strong is the Moon's gravity, as a share of Earth's?", category: "science", unit: PERCENT, answer: 17, range: [0, 100], step: 1, difficulty: 3, source: "NASA Moon Fact Sheet", verifiedAt: "2026-02-01" },
  { id: "sci-dog-chromosomes", prompt: "How many chromosomes does a dog have?", category: "science", unit: COUNT, answer: 78, range: [2, 200], step: 1, difficulty: 5, source: "National Human Genome Research Institute", verifiedAt: "2026-02-01" },
  { id: "sci-red-light", prompt: "What is the wavelength of red light?", subtitle: "At the red end of the visible spectrum", category: "science", unit: NM, answer: 700, range: [100, 1200], step: 5, difficulty: 4, source: "NIST", verifiedAt: "2026-02-01" },
  { id: "sci-earth-age", prompt: "How old is the Earth?", category: "science", unit: BN_YEARS, answer: 4.54, range: [0.5, 15], step: 0.01, difficulty: 2, source: "US Geological Survey", verifiedAt: "2026-02-01" },
  { id: "sci-mars-moons", prompt: "How many moons does Mars have?", category: "science", unit: COUNT, answer: 2, range: [0, 30], step: 1, difficulty: 2, source: "NASA", verifiedAt: "2026-02-01" },
  { id: "sci-seconds-year", prompt: "How many seconds are in a year?", subtitle: "In millions, for a 365-day year", category: "science", unit: MILLIONS, answer: 31.5, range: [1, 120], step: 0.1, difficulty: 3, source: "Arithmetic", verifiedAt: "2026-02-01" },

  // --- culture (expansion) --------------------------------------------------
  { id: "cul-burj", prompt: "How tall is the Burj Khalifa?", category: "culture", unit: M, answer: 828, range: [100, 2000], step: 1, difficulty: 2, source: "Council on Tall Buildings and Urban Habitat", verifiedAt: "2026-02-01" },
  { id: "cul-sonnet", prompt: "How many lines are in a Shakespearean sonnet?", category: "culture", unit: COUNT, answer: 14, range: [2, 50], step: 1, difficulty: 2, source: "Oxford English Dictionary", verifiedAt: "2026-02-01" },
  { id: "cul-beethoven", prompt: "How many symphonies did Beethoven complete?", category: "culture", unit: COUNT, answer: 9, range: [1, 40], step: 1, difficulty: 2, source: "Beethoven-Haus Bonn", verifiedAt: "2026-02-01" },
  { id: "cul-chess-pieces", prompt: "How many pieces are on a chessboard at the start of a game?", category: "culture", unit: COUNT, answer: 32, range: [2, 120], step: 1, difficulty: 1, source: "FIDE Laws of Chess", verifiedAt: "2026-02-01" },
  { id: "cul-deck", prompt: "How many cards are in a standard deck?", subtitle: "Excluding jokers", category: "culture", unit: COUNT, answer: 52, range: [5, 200], step: 1, difficulty: 1, source: "Standard playing card convention", verifiedAt: "2026-02-01" },
  { id: "cul-mona-lisa", prompt: "When did Leonardo begin the Mona Lisa?", category: "culture", unit: CE, answer: 1503, range: [1200, 1800], step: 1, difficulty: 4, source: "Musee du Louvre", verifiedAt: "2026-02-01" },
  { id: "cul-scrabble", prompt: "How many tiles are in a Scrabble set?", category: "culture", unit: COUNT, answer: 100, range: [10, 400], step: 1, difficulty: 3, source: "Mattel official rules", verifiedAt: "2026-02-01" },
  { id: "cul-semitones", prompt: "How many semitones are in an octave?", category: "culture", unit: COUNT, answer: 12, range: [2, 50], step: 1, difficulty: 2, source: "Grove Music Online", verifiedAt: "2026-02-01" },
  { id: "cul-bible-books", prompt: "How many books are in the Protestant Bible?", category: "culture", unit: COUNT, answer: 66, range: [5, 200], step: 1, difficulty: 3, source: "Protestant canon", verifiedAt: "2026-02-01" },
  { id: "cul-haiku", prompt: "How many syllables are in a traditional haiku?", category: "culture", unit: COUNT, answer: 17, range: [3, 60], step: 1, difficulty: 2, source: "Poetry Foundation", verifiedAt: "2026-02-01" },
  { id: "cul-titanic-oscars", prompt: "How many Academy Awards did 'Titanic' win?", category: "culture", unit: COUNT, answer: 11, range: [1, 40], step: 1, difficulty: 3, source: "Academy of Motion Picture Arts and Sciences", verifiedAt: "2026-02-01" },
  { id: "cul-potter-books", prompt: "How many Harry Potter novels are there?", category: "culture", unit: COUNT, answer: 7, range: [1, 30], step: 1, difficulty: 1, source: "Bloomsbury Publishing", verifiedAt: "2026-02-01" },
  { id: "cul-sphinx", prompt: "How tall is the Great Sphinx of Giza?", category: "culture", unit: M, answer: 20, range: [2, 120], step: 1, difficulty: 4, source: "Egyptian Ministry of Tourism and Antiquities", verifiedAt: "2026-02-01" },
  { id: "cul-sistine", prompt: "When did Michelangelo finish the Sistine Chapel ceiling?", category: "culture", unit: CE, answer: 1512, range: [1200, 1800], step: 1, difficulty: 4, source: "Vatican Museums", verifiedAt: "2026-02-01" },
  { id: "cul-moai", prompt: "How many moai stand on Easter Island?", category: "culture", unit: COUNT, answer: 887, range: [50, 4000], step: 1, difficulty: 5, source: "UNESCO World Heritage Centre", verifiedAt: "2026-02-01" },
  { id: "cul-spanish-steps", prompt: "How many steps are in the Spanish Steps in Rome?", category: "culture", unit: COUNT, answer: 135, range: [10, 600], step: 1, difficulty: 5, source: "Comune di Roma", verifiedAt: "2026-02-01" },
  { id: "cul-gatsby", prompt: "When was 'The Great Gatsby' published?", category: "culture", unit: CE, answer: 1925, range: [1800, 2000], step: 1, difficulty: 3, source: "Charles Scribner's Sons", verifiedAt: "2026-02-01" },
  { id: "cul-friends", prompt: "How many episodes of 'Friends' were made?", category: "culture", unit: COUNT, answer: 236, range: [20, 800], step: 1, difficulty: 4, source: "Warner Bros. Television", verifiedAt: "2026-02-01" },
  { id: "cul-terracotta", prompt: "How many terracotta warriors were buried at Xi'an?", subtitle: "Best archaeological estimate", category: "culture", unit: COUNT, answer: 8000, range: [100, 40000], step: 100, difficulty: 4, source: "Emperor Qinshihuang's Mausoleum Site Museum", verifiedAt: "2026-02-01" },
  { id: "cul-eu-stars", prompt: "How many stars are on the European Union flag?", category: "culture", unit: COUNT, answer: 12, range: [1, 50], step: 1, difficulty: 2, source: "European Commission", verifiedAt: "2026-02-01" },
  { id: "cul-nobel", prompt: "When were the first Nobel Prizes awarded?", category: "culture", unit: CE, answer: 1901, range: [1750, 1990], step: 1, difficulty: 3, source: "Nobel Foundation", verifiedAt: "2026-02-01" },
  { id: "cul-organ-pipes", prompt: "How many pipes does the world's largest church organ have?", subtitle: "Boardwalk Hall, Atlantic City", category: "culture", unit: COUNT, answer: 33112, range: [1000, 80000], step: 100, difficulty: 5, source: "Historic Organ Restoration Committee", verifiedAt: "2026-02-01" },
  // --- sport (expansion) ----------------------------------------------------
  { id: "spo-pool", prompt: "How long is an Olympic swimming pool?", category: "sport", unit: M, answer: 50, range: [5, 200], step: 1, difficulty: 1, source: "World Aquatics", verifiedAt: "2026-02-01" },
  { id: "spo-tennis-net", prompt: "How high is a tennis net at the centre?", category: "sport", unit: CM, answer: 91, range: [20, 200], step: 1, difficulty: 3, source: "International Tennis Federation", verifiedAt: "2026-02-01" },
  { id: "spo-hoop-diameter", prompt: "How wide is a basketball hoop?", category: "sport", unit: CM, answer: 46, range: [10, 150], step: 1, difficulty: 3, source: "FIBA official basketball rules", verifiedAt: "2026-02-01" },
  { id: "spo-shot-put", prompt: "How heavy is the men's Olympic shot put?", category: "sport", unit: COUNT2, answer: 7.26, range: [1, 25], step: 0.01, difficulty: 3, source: "World Athletics", verifiedAt: "2026-02-01" },
  { id: "spo-hockey-players", prompt: "How many ice hockey players are on the ice per side?", subtitle: "Including the goaltender", category: "sport", unit: COUNT, answer: 6, range: [1, 25], step: 1, difficulty: 2, source: "IIHF Official Rule Book", verifiedAt: "2026-02-01" },
  { id: "spo-goal-height", prompt: "How high is a football goal?", category: "sport", unit: M1, answer: 2.44, range: [0.5, 8], step: 0.01, difficulty: 3, source: "IFAB Laws of the Game", verifiedAt: "2026-02-01" },
  { id: "spo-goal-width", prompt: "How wide is a football goal?", category: "sport", unit: M1, answer: 7.32, range: [1, 20], step: 0.01, difficulty: 3, source: "IFAB Laws of the Game", verifiedAt: "2026-02-01" },
  { id: "spo-djokovic", prompt: "How many Grand Slam singles titles had Novak Djokovic won by the end of 2023?", category: "sport", unit: COUNT, answer: 24, range: [1, 60], step: 1, difficulty: 3, source: "ATP Tour records, 2023", verifiedAt: "2026-02-01" },
  { id: "spo-over", prompt: "How many balls are in a cricket over?", category: "sport", unit: COUNT, answer: 6, range: [1, 25], step: 1, difficulty: 2, source: "MCC Laws of Cricket", verifiedAt: "2026-02-01" },
  { id: "spo-fastest-serve", prompt: "How fast was the fastest recorded tennis serve?", subtitle: "Sam Groth, 2012", category: "sport", unit: KMH, answer: 263, range: [50, 500], step: 1, difficulty: 4, source: "ATP Tour", verifiedAt: "2026-02-01" },
  { id: "spo-nfl-teams", prompt: "How many teams are in the NFL?", category: "sport", unit: COUNT, answer: 32, range: [4, 80], step: 1, difficulty: 2, source: "National Football League", verifiedAt: "2026-02-01" },
  { id: "spo-diving-platform", prompt: "How high is the Olympic high diving platform?", category: "sport", unit: M, answer: 10, range: [1, 40], step: 1, difficulty: 2, source: "World Aquatics", verifiedAt: "2026-02-01" },
  { id: "spo-velodrome", prompt: "How long is an Olympic velodrome track?", category: "sport", unit: M, answer: 250, range: [50, 800], step: 1, difficulty: 4, source: "Union Cycliste Internationale", verifiedAt: "2026-02-01" },
  { id: "spo-water-polo", prompt: "How many water polo players are in the water per side?", category: "sport", unit: COUNT, answer: 7, range: [1, 25], step: 1, difficulty: 3, source: "World Aquatics", verifiedAt: "2026-02-01" },
  { id: "spo-high-jump", prompt: "What is the men's high jump world record?", subtitle: "Javier Sotomayor, 1993", category: "sport", unit: M1, answer: 2.45, range: [1, 5], step: 0.01, difficulty: 3, source: "World Athletics", verifiedAt: "2026-02-01" },
  { id: "spo-bowling-frames", prompt: "How many frames are in a game of ten-pin bowling?", category: "sport", unit: COUNT, answer: 10, range: [1, 40], step: 1, difficulty: 2, source: "World Bowling", verifiedAt: "2026-02-01" },
  { id: "spo-baseball-bases", prompt: "How far apart are baseball bases?", category: "sport", unit: FT, answer: 90, range: [10, 300], step: 1, difficulty: 3, source: "Major League Baseball Official Rules", verifiedAt: "2026-02-01" },
  { id: "spo-rugby-minutes", prompt: "How long is a rugby union match?", subtitle: "Two halves of regulation play", category: "sport", unit: MINUTES, answer: 80, range: [10, 200], step: 1, difficulty: 2, source: "World Rugby Laws of the Game", verifiedAt: "2026-02-01" },
  { id: "spo-merckx", prompt: "How many Tours de France did Eddy Merckx win?", category: "sport", unit: COUNT, answer: 5, range: [1, 20], step: 1, difficulty: 4, source: "Amaury Sport Organisation", verifiedAt: "2026-02-01" },
  { id: "spo-tokyo-nations", prompt: "How many national teams competed at the Tokyo 2020 Olympics?", category: "sport", unit: COUNT, answer: 206, range: [20, 500], step: 1, difficulty: 4, source: "International Olympic Committee", verifiedAt: "2026-02-01" },
  { id: "spo-table-tennis-ball", prompt: "How wide is a table tennis ball?", category: "sport", unit: MM, answer: 40, range: [5, 150], step: 1, difficulty: 3, source: "International Table Tennis Federation", verifiedAt: "2026-02-01" },
  { id: "spo-boxing-glove", prompt: "How heavy is a professional welterweight boxing glove?", category: "sport", unit: OZ, answer: 8, range: [1, 30], step: 1, difficulty: 4, source: "World Boxing Council", verifiedAt: "2026-02-01" },

  // --- economy (expansion) --------------------------------------------------
  { id: "eco-min-wage", prompt: "What is the US federal minimum wage per hour?", subtitle: "Unchanged since 2009", category: "economy", unit: USD, answer: 7.25, range: [1, 30], step: 0.05, difficulty: 3, source: "US Department of Labor", verifiedAt: "2026-02-01" },
  { id: "eco-eurozone", prompt: "How many countries use the euro?", category: "economy", unit: COUNT, answer: 20, range: [1, 60], step: 1, difficulty: 3, source: "European Central Bank, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-india-pop", prompt: "What is the population of India?", subtitle: "In billions, 2024 estimate", category: "economy", unit: BILLIONS2, answer: 1.44, range: [0.1, 4], step: 0.01, difficulty: 2, source: "UN Population Division, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-china-pop", prompt: "What is the population of China?", subtitle: "In billions, 2024 estimate", category: "economy", unit: BILLIONS2, answer: 1.41, range: [0.1, 4], step: 0.01, difficulty: 2, source: "UN Population Division, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-us-gdp", prompt: "What is the GDP of the United States?", subtitle: "In trillions of US dollars, 2023", category: "economy", unit: USD_T, answer: 27.4, range: [1, 80], step: 0.1, difficulty: 3, source: "US Bureau of Economic Analysis, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-walmart", prompt: "How many people does Walmart employ?", subtitle: "In millions, 2024", category: "economy", unit: MILLIONS, answer: 2.1, range: [0.1, 8], step: 0.1, difficulty: 4, source: "Walmart Inc. annual report, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-stamp", prompt: "What did a first-class US postage stamp cost in 2024?", category: "economy", unit: CENTS, answer: 68, range: [1, 250], step: 1, difficulty: 4, source: "United States Postal Service, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-starbucks", prompt: "How many Starbucks stores are there worldwide?", subtitle: "2023 company filing", category: "economy", unit: COUNT, answer: 38000, range: [1000, 120000], step: 100, difficulty: 4, source: "Starbucks Corporation 10-K, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-internet", prompt: "How much of the world's population uses the internet?", subtitle: "2023 estimate", category: "economy", unit: PERCENT, answer: 67, range: [0, 100], step: 1, difficulty: 3, source: "International Telecommunication Union, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-container-ship", prompt: "How many containers can the largest container ships carry?", subtitle: "In twenty-foot equivalent units", category: "economy", unit: COUNT, answer: 24000, range: [1000, 60000], step: 100, difficulty: 4, source: "Evergreen Marine A-class specification", verifiedAt: "2026-02-01" },
  { id: "eco-billionaires", prompt: "How many billionaires are there in the world?", subtitle: "Forbes list, 2024", category: "economy", unit: COUNT, answer: 2781, range: [100, 10000], step: 1, difficulty: 4, source: "Forbes World's Billionaires, 2024", verifiedAt: "2026-02-01" },
  { id: "eco-gold", prompt: "What did gold cost per troy ounce in January 2024?", category: "economy", unit: USD_K, answer: 2060, range: [100, 6000], step: 10, difficulty: 4, source: "London Bullion Market Association, Jan 2024", verifiedAt: "2026-02-01" },
  { id: "eco-wto", prompt: "How many members does the World Trade Organization have?", category: "economy", unit: COUNT, answer: 164, range: [20, 400], step: 1, difficulty: 4, source: "World Trade Organization", verifiedAt: "2026-02-01" },
  { id: "eco-smartphones", prompt: "How many smartphones are shipped worldwide each year?", subtitle: "In millions, 2023", category: "economy", unit: MILLIONS0, answer: 1170, range: [50, 3500], step: 10, difficulty: 4, source: "IDC Worldwide Quarterly Mobile Phone Tracker, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-cars", prompt: "How many cars are produced worldwide each year?", subtitle: "In millions, 2023", category: "economy", unit: MILLIONS0, answer: 93, range: [5, 350], step: 1, difficulty: 4, source: "OICA, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-peacekeepers", prompt: "How many UN peacekeepers are deployed?", subtitle: "2023", category: "economy", unit: COUNT, answer: 70000, range: [1000, 400000], step: 1000, difficulty: 5, source: "United Nations Peacekeeping, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-renewables", prompt: "How much of the world's electricity comes from renewables?", subtitle: "2023", category: "economy", unit: PERCENT, answer: 30, range: [0, 100], step: 1, difficulty: 3, source: "International Energy Agency, 2023", verifiedAt: "2026-02-01" },
  { id: "eco-model-3", prompt: "What did a Tesla Model 3 cost at its 2017 launch?", subtitle: "Base price, in thousands of US dollars", category: "economy", unit: USD_K, answer: 35, range: [5, 150], step: 1, difficulty: 3, source: "Tesla Inc., 2017", verifiedAt: "2026-02-01" },
  { id: "eco-747", prompt: "How many Boeing 747s were built?", category: "economy", unit: COUNT, answer: 1574, range: [100, 6000], step: 1, difficulty: 4, source: "Boeing Company, final delivery 2023", verifiedAt: "2026-02-01" },
  { id: "eco-tube-stations", prompt: "How many stations are on the London Underground?", category: "economy", unit: COUNT, answer: 272, range: [20, 700], step: 1, difficulty: 4, source: "Transport for London", verifiedAt: "2026-02-01" },
  { id: "eco-subway-stations", prompt: "How many stations are on the New York City Subway?", category: "economy", unit: COUNT, answer: 472, range: [20, 1200], step: 1, difficulty: 4, source: "Metropolitan Transportation Authority", verifiedAt: "2026-02-01" },
  { id: "eco-military", prompt: "What is global military spending per year?", subtitle: "In trillions of US dollars, 2023", category: "economy", unit: USD_T, answer: 2.44, range: [0.1, 12], step: 0.01, difficulty: 4, source: "SIPRI Military Expenditure Database, 2023", verifiedAt: "2026-02-01" },

  // --- nature (expansion) ---------------------------------------------------
  { id: "nat-lobster-legs", prompt: "How many legs does a lobster have?", category: "nature", unit: COUNT, answer: 10, range: [2, 40], step: 1, difficulty: 3, source: "Marine Biological Association", verifiedAt: "2026-02-01" },
  { id: "nat-bee-eyes", prompt: "How many eyes does a honeybee have?", category: "nature", unit: COUNT, answer: 5, range: [1, 25], step: 1, difficulty: 4, source: "British Beekeepers Association", verifiedAt: "2026-02-01" },
  { id: "nat-albatross", prompt: "How wide is a wandering albatross's wingspan?", category: "nature", unit: M1, answer: 3.1, range: [0.2, 8], step: 0.1, difficulty: 3, source: "British Antarctic Survey", verifiedAt: "2026-02-01" },
  { id: "nat-falcon", prompt: "How fast is a peregrine falcon in a dive?", category: "nature", unit: KMH, answer: 320, range: [20, 600], step: 1, difficulty: 3, source: "Royal Society for the Protection of Birds", verifiedAt: "2026-02-01" },
  { id: "nat-giraffe-neck", prompt: "How many vertebrae are in a giraffe's neck?", category: "nature", unit: COUNT, answer: 7, range: [1, 40], step: 1, difficulty: 4, source: "Giraffe Conservation Foundation", verifiedAt: "2026-02-01" },
  { id: "nat-whale-calf", prompt: "How much does a newborn blue whale weigh?", category: "nature", unit: KG, answer: 2700, range: [50, 12000], step: 10, difficulty: 4, source: "NOAA Fisheries", verifiedAt: "2026-02-01" },
  { id: "nat-dog-teeth", prompt: "How many teeth does an adult dog have?", category: "nature", unit: COUNT, answer: 42, range: [5, 150], step: 1, difficulty: 4, source: "American Veterinary Medical Association", verifiedAt: "2026-02-01" },
  { id: "nat-ant-species", prompt: "How many species of ant have been described?", category: "nature", unit: COUNT, answer: 13000, range: [100, 60000], step: 100, difficulty: 4, source: "AntWeb, California Academy of Sciences", verifiedAt: "2026-02-01" },
  { id: "nat-penguin-dive", prompt: "How deep can an emperor penguin dive?", category: "nature", unit: M, answer: 500, range: [10, 1500], step: 10, difficulty: 4, source: "British Antarctic Survey", verifiedAt: "2026-02-01" },
  { id: "nat-tortoise", prompt: "How long does a Galapagos tortoise live?", category: "nature", unit: YEARS, answer: 100, range: [5, 300], step: 5, difficulty: 3, source: "Galapagos Conservancy", verifiedAt: "2026-02-01" },
  { id: "nat-hyperion", prompt: "How tall is Hyperion, the tallest known tree?", category: "nature", unit: M, answer: 116, range: [10, 300], step: 1, difficulty: 3, source: "US National Park Service", verifiedAt: "2026-02-01" },
  { id: "nat-colony", prompt: "How many bees are in a honeybee colony at its summer peak?", category: "nature", unit: COUNT, answer: 50000, range: [500, 250000], step: 100, difficulty: 4, source: "British Beekeepers Association", verifiedAt: "2026-02-01" },
  { id: "nat-whale-gestation", prompt: "How long is a blue whale pregnant?", category: "nature", unit: MONTHS, answer: 11, range: [1, 40], step: 1, difficulty: 3, source: "NOAA Fisheries", verifiedAt: "2026-02-01" },
  { id: "nat-cow-stomach", prompt: "How many chambers does a cow's stomach have?", category: "nature", unit: COUNT, answer: 4, range: [1, 20], step: 1, difficulty: 2, source: "Royal Veterinary College", verifiedAt: "2026-02-01" },
  { id: "nat-arctic-tern", prompt: "How far does an Arctic tern migrate in a year?", category: "nature", unit: KM, answer: 70000, range: [1000, 150000], step: 1000, difficulty: 4, source: "Royal Society for the Protection of Birds", verifiedAt: "2026-02-01" },
  { id: "nat-body-water", prompt: "How much of the human body is water?", category: "nature", unit: PERCENT, answer: 60, range: [0, 100], step: 1, difficulty: 2, source: "US Geological Survey", verifiedAt: "2026-02-01" },
  { id: "nat-housefly", prompt: "How long does a housefly live?", category: "nature", unit: DAYS, answer: 28, range: [1, 150], step: 1, difficulty: 4, source: "Royal Entomological Society", verifiedAt: "2026-02-01" },
  { id: "nat-shark-species", prompt: "How many species of shark are there?", category: "nature", unit: COUNT, answer: 500, range: [10, 2500], step: 10, difficulty: 4, source: "IUCN Shark Specialist Group", verifiedAt: "2026-02-01" },
  { id: "nat-ostrich-egg", prompt: "How much does an ostrich egg weigh?", category: "nature", unit: G, answer: 1400, range: [20, 6000], step: 10, difficulty: 4, source: "Zoological Society of London", verifiedAt: "2026-02-01" },
  { id: "nat-bird-species", prompt: "How many species of bird are there?", category: "nature", unit: COUNT, answer: 11000, range: [200, 40000], step: 100, difficulty: 4, source: "BirdLife International", verifiedAt: "2026-02-01" },
  { id: "nat-hummingbird-egg", prompt: "How much does a hummingbird egg weigh?", category: "nature", unit: G1, answer: 0.5, range: [0, 12], step: 0.1, difficulty: 5, source: "Cornell Lab of Ornithology", verifiedAt: "2026-02-01" },
  { id: "nat-porcupine", prompt: "How many quills does a porcupine have?", category: "nature", unit: COUNT, answer: 30000, range: [100, 120000], step: 100, difficulty: 5, source: "Smithsonian's National Zoo", verifiedAt: "2026-02-01" },
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
