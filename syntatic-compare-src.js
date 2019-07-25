#!/usr/bin/env node

/**
 * @author Xiao Liang <https://github.com/yxliang01>
 * @version v0.1.1
 * 
 * Check two source code file, whether they are equal in parsed syntax tree, excluding comments and spacings.
 * Output a boolean string value(`true`/`false`) to identical whether two source code files are same in syntax tree level
 * (optionally, only on targered contract body).
 * 
 * USAGE: ./syntatic-compare-src.js <PATH_SRC1> <PATH_SRC2> [TargetContractName]
 * 
 * when specified TargetContractName, only the contract matching the name will be considered for comparison.
 * 
 * Note: before use, install package `solidity-parser-antlr` and `lodash` via npm
 * Note: only tested on node v10
 */

const parser = require('solidity-parser-antlr');
const { isEqual, unset } = require('lodash');
const fs = require('fs');
const assert = require('assert');


const loadFileContent = (x) => fs.readFileSync(x, 'utf-8');
const parseSrc = (x) => parser.parse(loadFileContent(x), {
    tolerant: false,
    loc: false,
    range: false
});

function main() {

    const path_src1 = process.argv[2];
    const path_src2 = process.argv[3];
    const targetContractName = process.argv[4];

    assert(path_src1 !== undefined && path_src2 !== undefined, `Must pass two source code paths. Received: path_src1:${path_src1}, path_src2:${path_src2}`);

    const ast_src1 = parseSrc(path_src1);
    const ast_src2 = parseSrc(path_src2);

    console.log(`${compareASTs(ast_src1, ast_src2, targetContractName)}`);
}

function compareASTs(ast_src1, ast_src2, targetContractName = undefined) {

    const ast1 = extractRelevantAST(ast_src1, targetContractName);
    if (ast1 !== undefined) {
        cleanAST(ast1);
    }

    const ast2 = extractRelevantAST(ast_src2, targetContractName);
    if (ast2 !== undefined) {
        cleanAST(ast2);
    }

    assert(!(ast1 === undefined && ast2 === undefined), `Supplied target contract name doesn't exist in both source code files!`);

    return isEqual(ast1, ast2);
}

function extractRelevantAST(ast, targetContractName = undefined) {
    if (targetContractName === undefined) {
        return ast;
    }

    let wantedNode = undefined;

    class EarlyExit extends Error { }

    try {
        parser.visit(ast, {
            ContractDefinition(node) {
                if (node.name === targetContractName) {
                    wantedNode = node;
                    throw new EarlyExit();
                }
            }
        })
    }
    catch (EarlyExit) {
    }

    return wantedNode;
}

/**
 * Remove semantic irrelevant ASTNode
 * This modifies the passed AST object
 */
function cleanAST(ast) {
    visitWithPath(ast, {

        Comment(_node, path) {
            assert(unset(ast, path));
            return false;
        },

        LineComment(_node, path) {
            assert(unset(ast, path));
            return false;
        },

        BlockComment(_node, path) {
            assert(unset(ast, path));
            return false;
        },
    });
}

function visitWithPath(
    node,
    visitor,
    path = [],
) {

    function _isASTNode(node) {
        return !!node && typeof node === 'object' && node.hasOwnProperty('type');
    }

    if (Array.isArray(node)) {
        node.forEach((child, idx) => visitWithPath(child, visitor, [...path, idx.toString()]));
    }

    if (!_isASTNode(node)) {
        return;
    }

    let cont = true;

    if (visitor[node.type] !== undefined) {
        cont = visitor[node.type](node, path);
    }

    if (cont === false) {
        return;
    }

    for (const prop in node) {
        if (node.hasOwnProperty(prop)) {
            visitWithPath(node[prop], visitor, [...path, prop]);
        }
    }

    const selector = node.type + ':exit';
    if (visitor[selector] !== undefined) {
        visitor[selector](node, path);
    }
}

main();
