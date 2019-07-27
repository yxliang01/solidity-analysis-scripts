#!/usr/bin/env node

/**
 * @author Xiao Liang <https://github.com/yxliang01>
 * @version v0.1.0
 *
 * Given a list of location objects in JSON format `{line: number, column: number | undefined}`(for single location) or 
 * `{start: {line: number, column: number | undefined}, end: {line: number, column: number | undefined}`(for a location range), 
 * return the list of functions (in form of `CONTRACT_NAME.FUNCTION_NAME`) covered by the given location objects in JSON format.
 * When column information is `undefined`, it specifies one whole line. When the function is the constructor, it writes `CONTRACT_NAME.null`.
 * 
 * USAGE: ./function-covered-by-locations.js <PATH_SRC> <Array of Location Objects in JSON format>
 * 
 * EXAMPLE (bash): 
 * `./function-covered-by-locations.js contract.sol "[{start: {line: 1, column: undefined}, end: {line: 3, column: 100}]"`
 * 
 * Note: only tested under node v10
 * 
*/

const parser = require('solidity-parser-antlr');
const fs = require('fs');
const assert = require('assert');

main();

//==============================================================

function main() {
    const locationObjs_ = JSON.parse(process.argv[3]);
    assert(Array.isArray(locationObjs_));

    locationObjs = locationObjs_.map((x) => x.start === undefined && x.end === undefined ? { start: x, end: x } : x);

    function isNodeInScope(node) {
        return locationObjs.some((loc) => locationIntersect(loc, node.loc));
    }

    const ast = parser.parse(fs.readFileSync(process.argv[2], {
        encoding: 'utf-8'
    }), { loc: true });

    const rst = [];

    let contractName = undefined;
    parser.visit(ast, {
        ContractDefinition(node) {

            if (isNodeInScope(node)) {
                contractName = node.name;
                return true;
            } else {
                return false;
            }

        },
        "ContractDefinition:exit"(node) {
            contractName = undefined;
        },
        FunctionDefinition(node) {
            assert(contractName !== undefined);

            if (isNodeInScope(node)) {
                rst.push(`${contractName}.${node.name}`);
            }

            return false;
        },
    });

    console.log(rst);
}

function locationIntersect(a, b) {

    // Start of a is inside b
    return (cmpLineColumn(a.start, b.start) >= 0 && cmpLineColumn(a.start, b.end) <= 0) ||
        // Start of b is inside a
        (cmpLineColumn(b.start, a.start) >= 0 && cmpLineColumn(b.start, a.end) <= 0)
}

function cmpLineColumn(a, b) {
    if (a.line === b.line) {
        return a.column - b.column;
    } else {
        return a.line - b.line;
    }
}
