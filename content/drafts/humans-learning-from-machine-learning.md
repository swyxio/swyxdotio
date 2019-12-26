---
title: What Humans Can Learn From Machine Learning
slug: humans-learning-from-machine-learning
category: Philosophy
begun: 2019-01-21
date: 2019-01-21
author: swyx
---

Human Learning differs from Machine Learning in important ways.

However, there are useful things we can take from ML

- the alpha parameter
- momentum: https://en.wikipedia.org/wiki/Stochastic_gradient_descent#Momentum
- optimality in the face of an impossibly large search space <- needed this source
- generalize > memorize by using a testing set
- epsilon exhaustion and Probably Approximately Correct learning
- naive bayes - how can it be right
  - So you just need to be directionally correct.
- random restart hill climbing
  - if theres a v specific point that is superbly better than others, you're in a bad world
- simulated annealing - hot and cold

- convert definites to maximum likelihood/probability densitiy estimation?
- transfer learning as a bootstrap -> genetic evolution?
- eager learning vs lazy learning
- convergence
  - will aliens be like us? yes if the conditions are same.
  - evolution: convergence

RL

- policy CAN change depending on whether youre playing with infinite horizon
- temporal attribution problem
- MDP => Bellman Equation => Value iteration strategy (rewards vs utiltiy vs always adding truth)
- PLANNER: model -> policy
- LEARNER: transitions -> policy
- MODELER: transition -> model
- SIMULATOR: model -> transition
- exploration/exploitation/explain dilemma

https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpiXLm24rgkZJbENxamD6f3ZDJfK7viU5gbhoGrwj1jp-AMBXVVg
https://swizec.com/blog/only-self-help-business-advice-you-need/swizec/7190

linear digressions

- conv nets - move stuff around - translational invariance
- rnn - languages
- micromanagement
  - starcraft etc alphazero were total untrained
  - given infinite time and data ofc we let total untrain
  - but dont have infinite data so helps to bootstrap

human in the loop

- https://www.youtube.com/watch?v=mog8r2AqW94&t=2339s
