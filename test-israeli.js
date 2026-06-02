const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical']
});

async function test() {
  const symbols = ['^TAINSUR.TA', '1215771.TA', 'TA-INSUR.TA', '1215771'];
  for (const symbol of symbols) {
    try {
      console.log('Fetching ' + symbol + '...');
      const quote = await yahooFinance.quote(symbol);
      if (quote) {
        console.log('  Success! Name: ' + (quote.longName || quote.shortName));
      } else {
        console.log('  Failed ' + symbol + ': No data returned');
      }
    } catch (error) {
      console.log('  Failed ' + symbol + ': ' + error.message);
    }
  }
}

test();
