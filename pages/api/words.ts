import wordWithFreq from "../../public/withfreq.json";
const onlyWords = Object.keys(wordWithFreq).filter(
  (mot) =>
    mot.length >= 6 &&
    mot.length <= 9 &&
    (wordWithFreq as any)[mot] > 3.02e-6 &&
    !mot.includes("!") &&
    !mot.includes(" ") &&
    !mot.includes("-") &&
    !mot.toUpperCase().startsWith("K") &&
    !mot.toUpperCase().startsWith("Q") &&
    !mot.toUpperCase().startsWith("W") &&
    !mot.toUpperCase().startsWith("X") &&
    !mot.toUpperCase().startsWith("Y") &&
    !mot.toUpperCase().startsWith("Z")
);

export default function handler(req, res) {
  res.status(200).json(wordWithFreq);
}