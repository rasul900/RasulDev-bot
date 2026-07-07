export const userStates = {};

export const getState = (userId) => userStates[userId];

export const setState = (userId, state) => {
  userStates[userId] = state;
};

export const clearState = (userId) => {
  delete userStates[userId];
};
