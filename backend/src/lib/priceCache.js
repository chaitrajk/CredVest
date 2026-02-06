// src/lib/priceCache.js
import NodeCache from "node-cache";
export default new NodeCache({ stdTTL: 300 });
