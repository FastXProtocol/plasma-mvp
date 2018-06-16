export const tests = {};

require('fs').readdirSync(__dirname + '/').forEach(function(file) {
  if (file && file.match(/^test[A-Z]\w+\.js$/)) {
    const name = file.replace('.js', '');
    tests[name] = require('./' + file);
  }
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
        runTests(Object.keys(tests));
    } else {
        let testId = process.argv[2];
        testId = "test" + testId.charAt(0).toUpperCase() + testId.slice(1);
        runTests([testId]);
    }
}