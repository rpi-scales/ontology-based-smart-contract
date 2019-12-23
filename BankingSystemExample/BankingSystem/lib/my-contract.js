//Course Selection and a simple voting system modified from the blockbean2 example

/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class MyContract extends Contract {

//     /**
//    *
//    * addMember
//    *
//    * When a member to the blockchain - can be either professor or student.
//    * @param id - the unique id to identify the member
//    * @param organization - what organization is the member part of
//    * @param address - address of org
//    * @param memberType - can be professor or student
//    */

//     async addMember(ctx, id, organization, address, memberType) {
//         console.info('addMember invoked');

//         //create object to hold details of our new member
//         let newMember = {};

//         newMember.id = id;
//         newMember.organization = organization;
//         newMember.address = address;
//         newMember.memberType = memberType;



//         await ctx.stub.putState(id, Buffer.from(JSON.stringify(newMember)));
//         console.info('updated ledger with key: ' + id + 'and value: ');
//         console.info(JSON.stringify(newMember));

//         return newMember;

//     }

    //initilise with some objects to play with
    async init(ctx) {
        console.info('init invoked');

        //test case

        // var today = new Date();
        // var date = (today.getMonth()+1)+'/'+today.getDate();
        await this.createBorrower(ctx,"b0","Adam", 100000.0, 100000.0, 50000.0, 0.0, 0.0, -1);
        await this.createMaxCredit(ctx,"c0", 500.0, "12/20", -1);
        //may want to keep all polls in an array
        //polls=[];
        //await ctx.stub.putState("polls", Buffer.from(JSON.stringify(polls)));


    }


    //Banking System Smart Contract

    async createPerson(ctx, id, name, saving) {
        const Person = {
            id,
            name,
            docType: "Person",
            saving
        }
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(Person)));
        console.info('============= END : Create Person ===========');
    }

    async createBorrower(ctx, id, name, saving, asset, income, debt, credit, max) {
        const Borrower = {
            id,
            name,
            docType: "Borrower",
            saving,
            asset,
            income,
            debt,
            credit,
            max
        }
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(Borrower)));
        console.info('============= END : Create Borrower ===========');
    }

    async createMaxCredit(ctx, id, max, due, b_id) {
        const MaxCredit = {
            id,
            docType: "MaxCredit",
            max,
            due,
            b_id
        }
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(MaxCredit)));
        console.info('============= END : Create MaxCredit ===========');
    }

    async createLoan(ctx, id, amount, rate, due, b_id) {
        const Loan = {
            id,
            docType: "MaxCredit",
            amount,
            rate,
            due,
            b_id
        }
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(Loan)));
        console.info('============= END : Create MaxCredit ===========');
    }

    async applyCredit(ctx, borrower_id, credit_id) {
        const creditAsBytes = await ctx.stub.getState(credit_id);
        if (!creditAsBytes || creditAsBytes.length === 0) {
            throw new Error(`${credit_id} does not exist`);
        }
        const credit = JSON.parse(creditAsBytes.toString());

        const borrowerAsBytes = await ctx.stub.getState(borrower_id);
        if (!borrowerAsBytes || borrowerAsBytes.length === 0) {
            throw new Error(`${borrower_id} does not exist`);
        }
        const borrower = JSON.parse(borrowerAsBytes.toString());

        var b = true;
        //TO-DO: connect to Oracle for validation

        if (!b) {
            throw new Error("Application Failed!\n");
        }
        else 
        {
            credit.b_id=borrower_id;
            borrower.max=credit_id;
            await ctx.stub.putState(credit_id, Buffer.from(JSON.stringify(credit)));
            await ctx.stub.putState(borrower_id, Buffer.from(JSON.stringify(borrower)));

        }
    }

    //Simple Voting

    async initiateVoting(ctx, poll_id, initiator_id, initiator_proposal) {
        let proposals = {};
        proposals[initiator_proposal] = initiator_id;
        let votes_count = {};
        votes_count[initiator_proposal] = 0;
        let votes = {};

        let poll = {
            poll_id,
            initiator_id,
            proposals,
            votes_count,
            votes
        };
        await ctx.stub.putState(poll_id, Buffer.from(JSON.stringify(poll)));
        console.info('============= END : Initiate Poll ===========');
    }

    async addProposal(ctx, poll_id, proposer_id, proposal) {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        let poll = JSON.parse(pollAsBytes.toString());
        //skip repeated proposal
        if (proposal in poll.proposals) {
            console.log('============= Failed: Proposal already exists ===========\n');
            return;
        }
        poll.proposals[proposal] = proposer_id;
        poll.votes_count[proposal] = 0;
        await ctx.stub.putState(poll.poll_id, Buffer.from(JSON.stringify(poll)));
        console.info('============= END : Add Proposal ===========');
    }

    async vote(ctx, poll_id, voter_id, proposal) {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        const poll = JSON.parse(pollAsBytes.toString());

        //if voter already voted, change the vote
        if (voter_id in poll.votes) {
            poll.votes_count[poll.votes[voter_id]] -= 1;
        }
        poll.votes[voter_id] = proposal;
        poll.votes_count[proposal] += 1;

        await ctx.stub.putState(poll.poll_id, Buffer.from(JSON.stringify(poll)));
        console.info('============= END : Vote ===========');
    }

    async endPoll(ctx, poll_id) {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        const poll = JSON.parse(pollAsBytes.toString());

        //Find the winner (majority rule)
        var max = -1;
        var winner = "a";
        var winner_proposal = "b";

        for (var p in poll.votes_count) {
            var v = poll.votes_count[p];
            if (v > max) {
                winner_proposal = p;
                max = v;
            }
        }
        winner = poll.proposals[winner_proposal];

        console.log("Winner: " + winner + "\nProposal: " + winner_proposal + "\n");

        //delete the ended poll from the chain
        let returnAsBytes = await ctx.stub.deleteState(poll_id);
        console.info(returnAsBytes)
        if (!returnAsBytes || returnAsBytes.length === 0) {
            console.info('no bytes returned')
            //return new Error(`successfully deleted key: ${poll_id}`);
        }

        //return the winner proposal and its proposer
        const out = {
            winner,
            winner_proposal
        }

        return JSON.stringify(out);
    }

    //Functionalites from blockbean2 example
    async query(ctx, key) {
        console.log('query by key ' + key);
        let returnAsBytes = await ctx.stub.getState(key);
        console.info(returnAsBytes)
        if (!returnAsBytes || returnAsBytes.length === 0) {
            return new Error(`${key} does not exist`);
        }
        let result = JSON.parse(returnAsBytes);
        console.info('result of getState: ');
        console.info(result);
        return JSON.stringify(result);
    }

    async deleteKey(ctx, key) {
        console.info('delete key: ' + key);
        let returnAsBytes = await ctx.stub.deleteState(key);
        console.info(returnAsBytes)
        if (!returnAsBytes || returnAsBytes.length === 0) {
            console.info('no bytes returned')
            return new Error(`successfully deleted key: ${key}`);
        }
        // let result = JSON.parse(returnAsBytes);
        // console.info('result of deleteState: ');
        // console.info(result);
        return JSON.stringify(returnAsBytes);
    }

    async queryAll(ctx) {

        let queryString = {
            "selector": {}
        }

        let queryResults = await this.queryWithQueryString(ctx, JSON.stringify(queryString));
        return queryResults;

    }

    async queryWithQueryString(ctx, queryString) {

        console.log("query String");
        console.log(JSON.stringify(queryString));

        let resultsIterator = await ctx.stub.getQueryResult(queryString);

        let allResults = [];

        while (true) {
            let res = await resultsIterator.next();

            if (res.value && res.value.value.toString()) {
                let jsonRes = {};

                console.log(res.value.value.toString('utf8'));

                jsonRes.Key = res.value.key;

                try {
                    jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    jsonRes.Record = res.value.value.toString('utf8');
                }

                allResults.push(jsonRes);
            }
            if (res.done) {
                console.log('end of data');
                await resultsIterator.close();
                console.info(allResults);
                console.log(JSON.stringify(allResults));
                return JSON.stringify(allResults);
            }
        }
    }

}

module.exports = MyContract;
