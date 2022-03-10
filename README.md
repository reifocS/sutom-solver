# SUTOM SOLVER

This is a solver for the French version of wordle, [sutom](https://sutom.nocle.fr/#).  
It uses information theory to give the best possible word to propose according to the current context.  
Inspired by the amazing [3blue1brown video's](https://www.youtube.com/watch?v=v68zYyaEmEA&t=47s)

## how to use
Find the best opening for the letter of the day.  
Fill in the grid with the word of your choice, enter the answer on sutom and fill in the correct colours in the solver, check proposed solutions and start again.

## area of improvement
There is certainly a way to improve the speed of the code because there are plenty of nested loops!  
For example, to find the best opening with A in 7 letters, we have to examine 2407 words, and for each one, we have to see what patterns are possible with all 2407 words. So It's already 2407 * 2407 iterations! 
I have chosen to display the progress rather than blocking the main thread but this also slows things down.  
The solver does not take into account the fact that a word is plausible or not, a lot of words in the dictionnary are very uncommon french words and could be ignored.  
Reduce HTML size...
