import wordWithFreq from "../../public/withfreq.json";


export default function handler(req, res) {
  // Get data from your database
  res.status(200).json(wordWithFreq);
}