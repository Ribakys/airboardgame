import React from "react";

import { isMacOS } from "../../utils/deviceInfos";

const PanZoomPane = ({
  children,
  onDrag = () => {},
  onDragStart = () => {},
  onDragEnd = () => {},
  onPan = () => {},
  onTap = () => {},
  onLongTap = () => {},
  onZoom = () => {},
}) => {
  const wrapperRef = React.useRef(null);
  const stateRef = React.useRef({
    moving: false,
  });

  const onWheel = React.useCallback(
    (e) => {
      const {
        deltaX,
        deltaY,
        clientX,
        clientY,
        ctrlKey,
        altKey,
        metaKey,
        target,
      } = e;

      // On a MacOs trackpad, the pinch gesture sets the ctrlKey to true.
      // In that situation, we want to use the custom scaling, not the browser default zoom.
      // Hence in this situation we avoid to return immediately.
      if (altKey || (ctrlKey && !isMacOS())) {
        return;
      }

      // On a trackpad, the pinch and pan events are differentiated by the crtlKey value.
      // On a pinch gesture, the ctrlKey is set to true, so we want to have a scaling effect.
      // If we are only moving the fingers in the same direction, a pan is needed.
      // Ref: https://medium.com/@auchenberg/detecting-multi-touch-trackpad-gestures-in-javascript-a2505babb10e
      if (isMacOS() && !ctrlKey) {
        onPan({
          deltaX: 2 * deltaX,
          deltaY: 2 * deltaY,
          button: 1,
          ctrlKey,
          metaKey,
          target,
          event: e,
        });
      } else {
        if (!deltaY) {
          return;
        }
        const scaleMult = 1 - (deltaY > 0 ? 1 : -1) / 5;
        onZoom({ scale: scaleMult, clientX, clientY, event: e });
      }
    },
    [onPan, onZoom]
  );

  const onPointerDown = React.useCallback(
    ({
      target,
      button,
      clientX,
      clientY,
      pointerId,
      altKey,
      ctrlKey,
      metaKey,
      isPrimary,
    }) => {
      if (!isPrimary) {
        return;
      }

      Object.assign(stateRef.current, {
        pressed: true,
        moving: false,
        gestureStart: false,
        startX: clientX,
        startY: clientY,
        prevX: clientX,
        prevY: clientY,
        currentButton: button,
        target,
        timeStart: Date.now(),
        longTapTimeout: setTimeout(() => {
          stateRef.current.noTap = true;
          onLongTap({
            clientX,
            clientY,
            altKey,
            ctrlKey,
            metaKey,
            target,
          });
        }, 750),
      });

      try {
        target.setPointerCapture(pointerId);
      } catch (e) {
        console.log("Fail to capture pointer", e);
      }
    },
    [onLongTap]
  );

  const onPointerMove = React.useCallback(
    (e) => {
      if (stateRef.current.pressed) {
        const {
          isPrimary,
          clientX,
          clientY,
          altKey,
          ctrlKey,
          metaKey,
          pointerType,
        } = e;

        if (!isPrimary) {
          return;
        }

        stateRef.current.moving = true;

        if (
          (stateRef.current.currentButton === 0 && !altKey) ||
          pointerType === "touch"
        ) {
          if (!stateRef.current.gestureStart) {
            onDragStart({
              deltaX: 0,
              deltaY: 0,
              startX: stateRef.current.startX,
              startY: stateRef.current.startY,
              distanceX: 0,
              distanceY: 0,
              button: stateRef.current.currentButton,
              altKey,
              ctrlKey,
              metaKey,
              target: stateRef.current.target,
              event: e,
            });
            wrapperRef.current.style.cursor = "move";
            stateRef.current.gestureStart = true;
            clearTimeout(stateRef.current.longTapTimeout);
          }

          onDrag({
            deltaX: clientX - stateRef.current.prevX,
            deltaY: clientY - stateRef.current.prevY,
            startX: stateRef.current.startX,
            startY: stateRef.current.startY,
            distanceX: clientX - stateRef.current.startX,
            distanceY: clientY - stateRef.current.startY,
            button: stateRef.current.currentButton,
            altKey,
            ctrlKey,
            metaKey,
            target: stateRef.current.target,
            event: e,
          });
        } else {
          if (!stateRef.current.gestureStart) {
            wrapperRef.current.style.cursor = "move";
            stateRef.current.gestureStart = true;
            clearTimeout(stateRef.current.longTapTimeout);
          }
          onPan({
            deltaX: clientX - stateRef.current.prevX,
            deltaY: clientY - stateRef.current.prevY,
            button: stateRef.current.currentButton,
            altKey,
            ctrlKey,
            metaKey,
            target: stateRef.current.target,
            event: e,
          });
        }

        stateRef.current.prevX = clientX;
        stateRef.current.prevY = clientY;
      }
    },
    [onDrag, onDragStart, onPan]
  );

  const onPointerUp = React.useCallback(
    (e) => {
      if (!e.isPrimary) {
        return;
      }
      const { clientX, clientY, altKey, ctrlKey, metaKey, target } = e;

      stateRef.current.pressed = false;

      clearTimeout(stateRef.current.longTapTimeout);

      if (stateRef.current.moving) {
        stateRef.current.moving = false;
        onDragEnd({
          deltaX: clientX - stateRef.current.prevX,
          deltaY: clientY - stateRef.current.prevY,
          startX: stateRef.current.startX,
          startY: stateRef.current.startY,
          distanceX: clientX - stateRef.current.startX,
          distanceY: clientY - stateRef.current.startY,
          button: stateRef.current.currentButton,
          altKey,
          ctrlKey,
          metaKey,
          event: e,
        });
        wrapperRef.current.style.cursor = "auto";
      } else {
        const now = Date.now();

        if (stateRef.current.noTap) {
          stateRef.current.noTap = false;
        } else {
          if (stateRef.current.timeStart - now < 300) {
            onTap({
              clientX,
              clientY,
              altKey,
              ctrlKey,
              metaKey,
              target,
            });
          }
        }
      }
    },
    [onDragEnd, onTap]
  );

  return (
    <div
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: "none" }}
      ref={wrapperRef}
    >
      {children}
    </div>
  );
};

export default PanZoomPane;
