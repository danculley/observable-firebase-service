/* From https://github.com/danculley/observable-firebase-service */
import Rx from 'rxjs/Rx';

export class FirebaseDataArray {
  items:Observable;
  
  constructor(public ref:string) {

    this.items = Rx.Observable.fromEventPattern(
      _ => this.ref.on('value', _),
      _ => this.ref.off('value', _)
      )
      .map(snapshot => snapshot.val())
      .map(value => {
        return Object
          .keys(value)
          .map(key => {
            if (typeof value[key] === 'object' && value !== null)
              return Object.assign({'.key':key}, value[key])
            else
              return {'.key':key, '.value':value[key]}
          })
      }) 
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
    this.value = Rx.Observable.fromEventPattern(
      _ => this.ref.on('value', _),
      _ => this.ref.off('value', _)
      )
      .map(snapshot => {
        if (typeof snapshot.val() === 'object' && snapshot.val() !== null)
            return Object.assign({'.key':snapshot.key()}, snapshot.val())
          else
            return {'.key':snapshot.key(), '.value':snapshot.val()}
      })
    
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
