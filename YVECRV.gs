function myFunction() {
  const statusR = 1;
  const statusC = 4;
  const row = 3;

  const date = 1;
  const yvecrv = 2;
  const crv = 3;
  const ratio = 4;

  const yvecrvID = 'vecrv-dao-yvault';
  const crvID = 'curve-dao-token';

  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

  const spread = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.setActiveSheet(spread.getSheetByName("Data"));
  const sp = PropertiesService.getScriptProperties();
  let timestamp = parseInt(Date.now() / 1000);
  const current = timestamp
  let boilerFrom = 1612865471
  let count = 0;
  spread.getActiveSheet().getRange(`${abc[statusR - 1]}${statusR}:${abc[statusC - 1]}${statusR}`).setBackground("Orange")

  if (spread.getActiveSheet().getRange(statusR, 1).getValue() == "RESET") {
    spread.getActiveSheet().getRange(statusR, 1).setValue("")
    sp.setProperties({
      "timestamp": 1620416920,
      "count": 0
    })
    timestamp = 1620416920
  } else {
    if (sp.getProperty("timestamp") != 0 && sp.getProperty("timestamp")) {
      boilerFrom = sp.getProperty("timestamp") * 1
    } else if (!(sp.getProperty("timestamp"))) {
      timestamp = 1620416920
    }
    if (sp.getProperty("count")) {
      count = parseInt(sp.getProperty("count"))
    }
  }


  function errorCheck(url) {
    let options = { muteHttpExceptions: true };
    Utilities.sleep(600);
    let b = UrlFetchApp.fetch(url, options);
    let a = b.getContentText();
    if (a[0] != "{" && a[0] != "[") {
      //Logger.log("Hello")
      return errorCheck(url);
    } else {
      return b;
    }
  }
  function createArray(array) {
    let compiledList = {}
    for (const x in array['prices']) {
      let hour = parseInt(array['prices'][x][0] / 3600000) * 3600000
      let indexMinute = parseInt(array['prices'][x][0] / 60000) * 60000
      compiledList[hour] = { ...compiledList[hour], [indexMinute]: array['prices'][x][1] }
    }
    return compiledList
  }
  function averageList(list) {
    let sum = 0;
    for (const a in list) {
      sum += list[a]
    }
    return (sum / Object.keys(list).length)
  }
  const yvecrvData = JSON.parse(errorCheck(`https://api.coingecko.com/api/v3/coins/${yvecrvID}/market_chart/range?vs_currency=usd&from=${boilerFrom}&to=${timestamp}`))
  const crvData = JSON.parse(errorCheck(`https://api.coingecko.com/api/v3/coins/${crvID}/market_chart/range?vs_currency=usd&from=${boilerFrom}&to=${timestamp}`))
  const yvecrvCompiled = createArray(yvecrvData);
  const crvCompiled = createArray(crvData);
  let sorted = {}
  for (const x in crvCompiled) {

    let avgCrv;
    let avgYvecrv
    if (yvecrvCompiled[x] == null) {
      continue
    } else if (Object.keys(crvCompiled[x]).length == Object.keys(yvecrvCompiled[x]).length) {
      let temp = {}
      for (const a in crvCompiled[x]) {
        if (yvecrvCompiled[x][a] == null) {
          temp = null
          avgCrv = averageList(crvCompiled[x])
          avgYvecrv = averageList(yvecrvCompiled[x])
          sorted[x] = { "ratio": avgYvecrv / avgCrv, "crv": avgCrv, "yvecrv": avgYvecrv }
          break;
        } else {
          temp[a] = { "ratio": yvecrvCompiled[x][a] / crvCompiled[x][a], "crv": crvCompiled[x][a], "yvecrv": yvecrvCompiled[x][a] }
        }
      }
      if (temp != null) {
        sorted = { ...sorted, ...temp }
      }
    }else{
      avgCrv = averageList(crvCompiled[x])
      avgYvecrv = averageList(yvecrvCompiled[x])
      sorted[x] = { "ratio": avgYvecrv / avgCrv, "crv": avgCrv, "yvecrv": avgYvecrv }
    }
  }
  let emails = {}
  if (parseInt(Object.keys(sorted)[0]) == parseInt(Date.parse(spread.getActiveSheet().getRange(row + (count - 1), date).getValue()))) {
    count --
    let crvAvg = (spread.getActiveSheet().getRange(row + (count), crv).getValue() + sorted[Object.keys(sorted)[0]]["crv"]) / 2
    let yvecrvAvg = (spread.getActiveSheet().getRange(row + (count), yvecrv).getValue() + sorted[Object.keys(sorted)[0]]["yvecrv"]) / 2
    sorted[Object.keys(sorted)[0]] = {"ratio": yvecrvAvg / crvAvg, "crv": crvAvg, "yvecrv": yvecrvAvg}

  }
  for (const b in sorted) {
    let unixDate = new Date(parseInt(b))
    if ((parseInt(b)/1000) > current - 3600) {
      let eRatio = sorted[b]["ratio"]
      if (sorted[b]["ratio"] < 0.8) {
        emails["below"] = { ...emails["below"], [count - row]: { "ratio": eRatio, "date": parseInt(b) } }
      } else if (sorted[b]["ratio"] > 1.1) {
        emails["above"] = { ...emails["above"], [count - row]: { "ratio": eRatio, "date": parseInt(b) } }
      }
    }
    spread.getActiveSheet().getRange(row + count, yvecrv).setValue(sorted[b]["yvecrv"])
    spread.getActiveSheet().getRange(row + count, crv).setValue(sorted[b]["crv"])
    spread.getActiveSheet().getRange(row + count, ratio).setValue(sorted[b]["ratio"])
    spread.getActiveSheet().getRange(row + count, date).setValue(`${unixDate.toLocaleDateString("en-US")} ${unixDate.getHours()}:${unixDate.getMinutes() == 0 ? "00" : unixDate.getMinutes()}`)
    count++
  }
    if (Object.keys(emails).length >= 1) {
      for (const x in emails) {
        let stringified = ''
        for (const z in emails[x]) {
          let eTime = new Date(parseInt(emails[x][z]["date"]))
          stringified += `Row: ${z} Ratio: ${emails[x][z]["ratio"]} Date: ${eTime.toLocaleDateString("en-US")} ${eTime.getHours()}:${eTime.getMinutes() == 0 ? "00" : eTime.getMinutes()}\n`
        }
        MailApp.sendEmail(`3zeet3@gmail.com`, `yvecrv ${x} threshold`, `${stringified}`);
      }
    }
  SpreadsheetApp.setActiveSheet(spread.getSheetByName("Chart"))
  var chartBuilder = spread.getActiveSheet().newChart();
  if (spread.getActiveSheet().getCharts()[0] != null) {
    let modify = spread.getActiveSheet().getCharts()[0].modify()
      .clearRanges()
      .addRange(spread.getActiveSheet().getRange(`Data!${abc[date - 1]}${row}:${abc[date - 1]}${count + row}`))
      .addRange(spread.getActiveSheet().getRange(`Data!${abc[ratio - 1]}${row}:${abc[ratio - 1]}${count + row}`))
      .build();
    spread.getActiveSheet().updateChart(modify)
  } else {
    chartBuilder.addRange(spread.getActiveSheet().getRange("A1:D8"))
      .setChartType(Charts.ChartType.TIMELINE)
      .setOption('title', 'YVECRV to CRV')
      .setOption("height", 700)
      .setOption("width", 1786)
      .addRange(spread.getActiveSheet().getRange(`Data!${abc[date - 1]}${row}:${abc[date - 1]}${count + row}`))
      .addRange(spread.getActiveSheet().getRange(`Data!${abc[ratio - 1]}${row}:${abc[ratio - 1]}${count + row}`));
    spread.getActiveSheet().insertChart(chartBuilder.setPosition(1, 1, 0, 0).build());
  }
  sp.setProperties({
    "timestamp": timestamp,
    "count": count
  })
  SpreadsheetApp.setActiveSheet(spread.getSheetByName("Data"))
  spread.getActiveSheet().getRange(`${abc[statusR - 1]}${statusR}:${abc[statusC - 1]}${statusR}`).setBackground("Green")
}
