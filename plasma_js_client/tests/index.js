export const tests = {};

require('fs').readdirSync(__dirname + '/').forEach(function(file) {
  if (file && file.match(/^test[A-Z]\w+\.js$/)) {
    const name = file.replace('.js', '');
    tests[name] = require('./' + file);
  }
});

const readableTestIds = Object.keys(tests).map(key => {
    return key.charAt(4).toLowerCase() + key.slice(5);
});


const runTest = async(testId) => {
    console.log("running " + testId + " ...");
    try {
        await tests[testId].default();
    } catch(e) {
        console.log(e);
        console.log(testId + " failed");
        return;
    }
    console.log(testId + " finished successfully");
};

const runTests = async(testIds) => {
    for(const testId of testIds){
        await runTest(testId);
    }
    process.exit()
}


if (typeof require != "undefined" && require.main == module) {
    if (process.argv.length <= 2){
//         runTests(Object.keys(tests));
        console.log("testId required, available tests: " + readableTestIds.join(", "));
    } else {
        let testId = process.argv[2];
        testId = "test" + testId.charAt(0).toUpperCase() + testId.slice(1);
        if(tests[testId] == null){
            console.log("testId invalid, available tests: " + readableTestIds.join(", "));
        }else{
            runTests([testId]);
        }
    }
}