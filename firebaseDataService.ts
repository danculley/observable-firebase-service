import {Observable} from 'angular2/angular2';

// Helper method for transforming the key/value pair from a snapshot into an object
function _createRecord(key, value) {
  var record = {};
  if (typeof value === 'object' && value !== null) {
    record = value;
  } else {
    record['.value'] = value;
  }
  record['.key'] = key;

  return record;
}

export class FirebaseDataArray {
  items:Observable;
  
  constructor(public ref:string) {

    this.items = new Observable(observer => {
      let data = [];
      let doneWithInitialLoading = false;
      
      // Set up bindings relevant to firebase arrays
      this.ref.on('child_added', child_added, error);
      this.ref.on('child_removed', child_removed, error);
      this.ref.on('child_changed', child_changed, error);
      this.ref.on('child_moved', child_moved, error);
      
      // Set up a one-time binding to value to know when we're current with the existing database
      this.ref.once('value', value, error);
      
      function error(err) {
        observer.error(err);
      }
      
      // Once we're current with the existing database, emit the first value
      function value(snapshot) {
        doneWithInitialLoading = true;
        observer.next(data);
      }
      
      function child_added(snapshot, previousChildKey) {
        // Determine where to insert the new record
        var insertionIndex;
        if (previousChildKey === null) {
          insertionIndex = 0;
        } else {
          let previousChildIndex = data.findIndex(e => e['.key'] === previousChildKey);
          insertionIndex = previousChildIndex + 1;
        }
        
        // Add the new record to the array
        data.splice(insertionIndex, 0, _createRecord(snapshot.key(), snapshot.val()));
        
        // Emit the state from the observable if we're done with initial loading
        if (doneWithInitialLoading)
          observer.next(data);
      }
      
      function child_removed(snapshot) {
         // Look up the record's index in the array
        var index = data.findIndex(e => e['.key'] === snapshot.key());
      
        // Splice out the record from the array
        data.splice(index, 1); 
        
        // Emit the state from the observable
        observer.next(data);
      }
      
      function child_changed(snapshot) {
        // Look up the record's index in the array
        var index = data.findIndex(e => e['.key'] === snapshot.key());
      
        // Update the record's value in the array
        data[index] = _createRecord(snapshot.key(), snapshot.val());
        
        // Emit the state from the observable
        observer.next(data);
      }
      
      function child_moved(snapshot, previousChildKey) {
        // Look up the record's index in the array
        var currentIndex = data.findIndex(e => e['.key'] === snapshot.key());
      
        // Splice out the record from the array
        var record = data.splice(currentIndex, 1)[0];
      
        // Determine where to re-insert the record
        var insertionIndex;
        if (previousChildKey === null) {
          insertionIndex = 0;
        } else {
          let previousChildIndex = data.findIndex(e => e['.key'] === previousChildKey);
          insertionIndex = previousChildIndex + 1;
        }
      
        // Re-insert the record into the array in the correct location
        data.splice(insertionIndex, 0, record);
        
        // Emit the state from the observable
        observer.next(data);
      }

      // Return a function that tears down the bindings
      return () => {
        this.ref.off('child_added', child_added);
        this.ref.off('child_removed', child_removed);
        this.ref.off('child_changed', child_changed);
        this.ref.off('child_moved', child_moved);
      };
    });
  }
  
  // Add a new item to the array
  push(newRecord) {
    return new Promise((resolve, reject)=>{
      this.ref.push(newRecord, err => err? reject(err) : resolve());
    });
  }
  
  // Modify an existing item in the array
  save(record) {
    return new Promise((resolve, reject) => {
      let child = this.ref.child(record['.key']);
      child.set(record, err=> err ? reject(err) : resolve());
    });
  }
  
  // Modify an existing item in the array
  remove(record) {
    return new Promise((resolve, reject) => {
      this.ref.child(record['.key']).remove(err=> err ? reject(err) : resolve());
    });
  }
}

export class FirebaseDataObject {
  value:Observable;
  
  constructor(public ref:string, public cancelCallback) {
    this.value = new Observable(observer => {
      let data = {};
      
      //setup firebasebindings
      ref.on('value', value, error);
      
      function error(err) {
        observer.error(err);
      }
      
      function value(snapshot) {
        // Create a new record from the snapshot
        data = _createRecord(snapshot.key(), snapshot.val());
        
        // Emit the state from the observable
        observer.next(data);
      }
      
      return () => this.ref.off('value', value);
    });
  }
  
  // Modify the item
  save() {
    return new Promise((resolve, reject) => {
      this.ref.set(record, err=> err ? reject(err) : resolve());
    });
  }
  
  // Remove the item
  remove() {
    return new Promise((resolve, reject) => {
      this.ref.remove(err=> err ? reject(err) : resolve());
    });
  }
  
}

export class FirebaseDataService {

  // Returns a helper object with an observable property (value) that emits an Object each time the database changes
  // Includes helper methods to modify the Object in the database
  getObject(firebaseRef, cancelCallback) {
    return new FirebaseDataObject(firebaseRef);
  }
  
  // Returns a helper object with an observable property (items) that emits an Array each time the database changes
  // Includes helper methods to modify the Array in the database
  getArray(firebaseRef, cancelCallback) {
    return new FirebaseDataArray(firebaseRef);
  }
  
}
