#!/usr/bin/env node

/**
  @author Xiao Liang <https://github.com/yxliang01>
  @version v0.1.2
  
  Print all the functions defined in targeted contractName as a JSON array
  
  USAGE: ./all-function-names.js <PATH_SRC> <TARGET_CONTRACT_NAME>
  
  Note: before use, install package "solidity-parser-antlr" via npm
*/

const parser = require("solidity-parser-antlr");
const fs = require('fs');

const contractName = process.argv[3];

const rst = [];

const ast = parser.parse(fs.readFileSync(process.argv[2], 'utf-8'));
parser.visit(ast, {
    ContractDefinition(node) {
        if(node.name === contractName) {
            return true;
        } else {
            return false;
        }
    },
    
    FunctionDefinition(node) {
        rst.push(node.name);
        return false;
    }
});

console.log(JSON.stringify(rst));
