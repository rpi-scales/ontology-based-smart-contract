//Course Selection and a simple voting system modified from the blockbean2 example

/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class MyContract extends Contract {

    /**
   *
   * addMember
   *
   * When a member to the blockchain - can be either professor or student.
   * @param id - the unique id to identify the member
   * @param organization - what organization is the member part of
   * @param address - address of org
   * @param memberType - can be professor or student
   */

    async addMember(ctx, id, organization, address, memberType) {
        console.info('addMember invoked');

        //create object to hold details of our new member
        let newMember = {};

        newMember.id = id;
        newMember.organization = organization;
        newMember.address = address;
        newMember.memberType = memberType;



        await ctx.stub.putState(id, Buffer.from(JSON.stringify(newMember)));
        console.info('updated ledger with key: ' + id + 'and value: ');
        console.info(JSON.stringify(newMember));

        return newMember;

    }

    //initilise with some objects to play with
    async init(ctx) {
        console.info('init invoked');

        //initial students
        const students = [
            {
                student_id: 's0',
                first_name: 'Abby',
                last_name: 'Johnson',
                registered_credits: 4,
                total_credits: 20,
                student_year: 1,
                registered_course: ['c0']

            },
            {
                student_id: 's1',
                first_name: 'Bob',
                last_name: 'Black',
                registered_credits: 4,
                total_credits: 110,
                student_year: 4,
                registered_course: ['c1']
            }


        ]

        const courses = [
            {
                course_id:'c0',
                course_name: 'MATH 1200',
                capacity: 10,
                credits: 4,
                price: 1,
                actualStudentNumber: 1,
                actualStudent: ['s0']
            },
            {
                course_id:'c1',
                course_name: 'CSCI 4800',
                capacity: 10,
                credits: 4,
                price: 4,
                actualStudentNumber: 1,
                actualStudent: ['s1']
            }

        ];

        for (let i = 0; i < students.length; i++) {
            students[i].docType = 'student';
            await ctx.stub.putState("s" + i, Buffer.from(JSON.stringify(students[i])));
            console.info('Added <--> ', students[i]);
        }

        for (let i = 0; i < courses.length; i++) {
            courses[i].docType = 'course';
            await ctx.stub.putState("c" + i, Buffer.from(JSON.stringify(courses[i])));
            console.info('Added <--> ', courses[i]);
        }

        //may want to keep all polls in an array
        //polls=[];
        //await ctx.stub.putState("polls", Buffer.from(JSON.stringify(polls)));


    }


    //Course Selection Smart Contract

    async createCourse(ctx,course_id,course_name,capacity,credits,price)
    {
        const course={
            course_name,
            docType:"Course",
            capacity,
            credits,
            price,
            actualStudentNumber: 0,
            actualStudent: []
        }
        await ctx.stub.putState(course_id, Buffer.from(JSON.stringify(course)));
        console.info('============= END : Create Course ===========');
    }

    async createStudent(ctx,student_id,first_name,last_name,total_credits,student_year)
    {
        const student={
            first_name,
            last_name,
            docType:"Student",
            registered_credits: 0,
            total_credits,
            student_year,
            registered_course: []
        }
        await ctx.stub.putState(student_id, Buffer.from(JSON.stringify(student)));
        console.info('============= END : Create Student ===========');
    }

    async addCourse(ctx,student_id,course_id)
    {
        const courseAsBytes = await ctx.stub.getState(course_id);
        if (!courseAsBytes || courseAsBytes.length === 0) {
            throw new Error(`${course_id} does not exist`);
        }
        const course = JSON.parse(courseAsBytes.toString());

        const studentAsBytes = await ctx.stub.getState(student_id);
        if (!studentAsBytes || studentAsBytes.length === 0) {
            throw new Error(`${student_id} does not exist`);
        }
        const student = JSON.parse(studentAsBytes.toString());



        if (course.capacity<=course.actualStudentNumber) {
            throw new Error("Course " + course.course_name + " is filled");
        }
        else {
            if (course.price>student.student_year){
                throw new Error("Course " + course.course_name + " is not in your timeslot");
            }

            else {
                var exist=0;
                for (let i=0; i<course.actualStudentNumber; i++) {
                    if (course.actualStudent[i].student_id==student.student_id) exist=1;
                }
                if (!exist){
                    course.actualStudentNumber+=1;
                    course.actualStudent.push(student.student_id)
                    await ctx.stub.putState(course_id, Buffer.from(JSON.stringify(course)));

                    student.registered_credits+=course.credits;
                    student.registered_course.push(course.course_id);
                    await ctx.stub.putState(student_id, Buffer.from(JSON.stringify(student)));

                }
                else {throw new Error("Student " + student.student_id +" is already in course: "+course.course_name);}
            }
        }
    }

    //Simple Voting

    async initiateVoting(ctx, poll_id, initiator_id, initiator_proposal)
    {
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

    async addProposal(ctx, poll_id, proposer_id, proposal)
    {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        let poll = JSON.parse(pollAsBytes.toString());
        //skip repeated proposal
        if(proposal in poll.proposals)
        {
            console.log('============= Failed: Proposal already exists ===========\n');
            return;
        }
        poll.proposals[proposal]=proposer_id;
        poll.votes_count[proposal]=0;
        await ctx.stub.putState(poll.poll_id, Buffer.from(JSON.stringify(poll)));
        console.info('============= END : Add Proposal ===========');
    }

    async vote(ctx, poll_id, voter_id, proposal)
    {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        const poll = JSON.parse(pollAsBytes.toString());

        //if voter already voted, change the vote
        if (voter_id in poll.votes)
        {
            poll.votes_count[poll.votes[voter_id]]-=1;
        }
        poll.votes[voter_id]=proposal;
        poll.votes_count[proposal]+=1;

        await ctx.stub.putState(poll.poll_id, Buffer.from(JSON.stringify(poll)));
        console.info('============= END : Vote ===========');
    }

    async endPoll(ctx, poll_id)
    {
        const pollAsBytes = await ctx.stub.getState(poll_id);
        if (!pollAsBytes || pollAsBytes.length === 0) {
            throw new Error(`${poll_id} does not exist`);
        }
        const poll = JSON.parse(pollAsBytes.toString());

        //Find the winner (majority rule)
        var max = -1;
        var winner = "a";
        var winner_proposal = "b";
        
        for (var p in poll.votes_count)
        {
            var v = poll.votes_count[p];
            if(v>max)
            {
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
        const out={
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
