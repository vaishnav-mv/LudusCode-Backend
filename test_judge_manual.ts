
import 'reflect-metadata';
import { JudgeService } from './src/services/judgeService';
import { SubmissionStatus } from './src/types';

async function testJudge() {
    const judge = new JudgeService();
    console.log("=== Testing JudgeService (Piston Integration) ===");

    // Test 1: Valid JS
    console.log("\n[1] Running Valid Javascript...");
    const jsResult = await judge.execute(
        "function solution(a) { return a + 1; }",
        "",
        [{ input: "1", output: "2", isSample: true }],
        { functionName: 'solution' },
        'javascript'
    );
    console.log("JS Result:", jsResult.overallStatus);
    if (jsResult.overallStatus === SubmissionStatus.Accepted) console.log("✅ JS Passed");
    else console.error("❌ JS Failed", jsResult);

    // Test 2: Malicious Python (RCE Attempt)
    console.log("\n[2] Running Malicious Python (RCE)...");
    const pyResult = await judge.execute(
        "import os\nprint(os.listdir('/'))",
        "",
        [{ input: "1", output: "1", isSample: true }],
        { functionName: 'solution' },
        'python'
    );
    console.log("Python Attempt Output:", pyResult.results[0]?.userOutput);
    // Piston should run it but it shouldn't show sensitive host files. 
    // Actually Piston allows os.listdir('/') but it lists the CONTAINER filesystem, not the HOST.
    // The key is that it runs successfully (or fails if restricted) but is SANDBOXED.
    console.log("✅ Python ran in sandbox (Check output above - should be container paths like /bin /dev etc, not host Windows paths)");

    // Test 3: Infinite Loop (Timeout)
    console.log("\n[3] Running Infinite Loop...");
    const loopResult = await judge.execute(
        "while(true);",
        "",
        [{ input: "1", output: "1", isSample: true }],
        { functionName: 'solution' },
        'javascript'
    );
    console.log("Loop Result:", loopResult.overallStatus); // Should be RunTimeError (Timeout) or Piston kills it
}

testJudge().catch(console.error);
