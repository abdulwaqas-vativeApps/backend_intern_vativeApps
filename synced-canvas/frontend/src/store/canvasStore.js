import { create } from "zustand";

export const useCanvasStore = create((set) => ({
  strokes: [],
  currentStrokes: {},
  currentRoom: null,
  roomMembers: [],
  user: null,
  undoStack: [], // Track undone strokes for redo

  startStroke: ({ userId, strokeId, point }) =>
    set((state) => ({
      currentStrokes: {
        ...state.currentStrokes,
        [userId]: { strokeId, points: [point] },
      },
      // undoStack: [], // Clear redo stack when new action is performed
    })),

  addPoint: ({ userId, strokeId, point }) =>
    set((state) => {
      const existing = state.currentStrokes[userId];
      if (!existing || existing.strokeId !== strokeId) return {};

      return {
        currentStrokes: {
          ...state.currentStrokes,
          [userId]: {
            ...existing,
            points: [...existing.points, point],
          },
        },
      };
    }),

  endStroke: ({ userId, strokeId, color, brushSize, points }) =>
    set((state) => {
      const current = state.currentStrokes[userId];
      if (!current || current.strokeId !== strokeId) return {};

      const finishedStroke = {
        strokeId,
        userId,
        color,
        brushSize,
        points
      };

      const { [userId]: _, ...rest } = state.currentStrokes;

      return {
        strokes: [...state.strokes, finishedStroke],
        currentStrokes: rest,
      };
    }),

  undo: (strokeId) =>
    set((state) => {
      const stroke = state.strokes.find((s) => s.strokeId === strokeId);
      if (!stroke) return {};

      return {
        strokes: state.strokes.filter((stroke) => stroke.strokeId !== strokeId),
        undoStack: [...state.undoStack, stroke], // Add to redo stack
      };
    }),

  redo: (stroke) =>
    set((state) => {
      if (!stroke) return {};

      const newUndoStack = state.undoStack.filter(
        (s) => s.strokeId !== stroke.strokeId,
      );

      return {
        strokes: [...state.strokes, stroke],
        undoStack: newUndoStack, // Remove from redo stack
      };
    }),

  clear: () =>
    set({
      strokes: [],
      currentStrokes: {},
      undoStack: [],
    }),

  setCurrentRoom: (room) => set({ currentRoom: room }),
  setRoomMembers: (members) => set({ roomMembers: members }),
  setStrokes: (newStrokes) => set({ strokes: newStrokes, undoStack: [] }),
  setUser: (user) => set({ user }),
}));

// import { create } from "zustand";

// export const useCanvasStore = create((set) => ({
//   strokes: [],
//   currentStrokes: {},
//   redoStack: [],

//   // ==================================
//   // start a new stroke for a user with the initial point
//   // ==================================
//   startStroke: ({ userId, strokeId, point }) =>
//     set((state) => ({
//       currentStrokes: {
//         ...state.currentStrokes,
//         [userId]: {
//           strokeId,
//           points: [point],
//         },
//       },
//     })),

//   // ==================================
//   // add a point to the current stroke of a user
//   // ==================================
//   addPoint: ({ userId, point }) =>
//     set((state) => {
//       const existing = state.currentStrokes[userId];

//       // SAFETY CHECK
//       if (!existing) {
//         return {}; // ignore invalid packet
//       }

//       return {
//         currentStrokes: {
//           ...state.currentStrokes,
//           [userId]: {
//             ...existing,
//             points: [...existing.points, point],
//           },
//         },
//       };
//     }),

//   // ==================================
//   // end the stroke of a user and move it from currentStrokes to strokes array
//   // ===================================
//   endStroke: ({ userId, color, brushSize }) =>
//     set((state) => {
//       const current = state.currentStrokes[userId];

//       if (!current) return {};

//       const finishedStroke = {
//         strokeId: current.strokeId,
//         userId,
//         color,
//         brushSize,
//         points: current.points,
//       };

//       const { [userId]: _, ...rest } = state.currentStrokes;

//       return {
//         strokes: [...state.strokes, finishedStroke],
//         currentStrokes: rest,
//       };
//     }),

//   // ==================================
//   // undo the last stroke of a user
//   //===================================
//   undo: (strokeId) =>
//     set((state) => {
//       const strokeToRemove = state.strokes.find(
//         (stroke) => stroke.strokeId === strokeId,
//       );

//       if (!strokeToRemove) return {};

//       return {
//         strokes: state.strokes.filter((stroke) => stroke.strokeId !== strokeId),
//         redoStack: [...state.redoStack, strokeToRemove],
//       };
//     }),

//   // ==================================
//   // redo the last undo stroke of a user
//   // ==================================
//   redo: (userId) =>
//     set((state) => {
//       // find last undone stroke of this user
//       const reversed = [...state.redoStack].reverse();
//       const strokeToRestore = reversed.find(
//         (stroke) => stroke.userId === userId,
//       );

//       if (!strokeToRestore) return {};

//       return {
//         strokes: [...state.strokes, strokeToRestore],
//         redoStack: state.redoStack.filter(
//           (stroke) => stroke.strokeId !== strokeToRestore.strokeId,
//         ),
//       };
//     }),

//   // ==================================
//   // clear all strokes from the canvas
//   // ==================================
//   clear: () =>
//     set({
//       strokes: [],
//       currentStrokes: {},
//     }),
// }));
